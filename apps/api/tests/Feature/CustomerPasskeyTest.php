<?php

namespace Tests\Feature;

use App\CustomerSms;
use App\Mail\CustomerSignInAlertMail;
use App\Mail\CustomerSignInCodeMail;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Laravel\Passkeys\Passkey;
use Tests\TestCase;

class CustomerPasskeyTest extends TestCase
{
    use RefreshDatabase;

    private const GARBAGE_CREDENTIAL = ['id' => 'abc', 'rawId' => 'abc', 'type' => 'public-key', 'response' => ['clientDataJSON' => 'not-json']];

    protected function setUp(): void
    {
        parent::setUp();
        config(['customer_auth.sms_driver' => 'array']);
        CustomerSms::$sent = [];
        RateLimiter::clear('customer-sign-in:'.hash('sha256', 'ama@example.com'));
        Mail::fake();
    }

    private function customer(string $email = 'ama@example.com'): Customer
    {
        return Customer::query()->create(['name' => 'Ama Owusu', 'email' => $email]);
    }

    private function token(Customer $customer, string $channel = 'email'): string
    {
        return $customer->createToken('test', ['customer', 'channel:'.$channel])->plainTextToken;
    }

    private function addPasskey(Customer $customer, string $credentialId = 'credential-1'): Passkey
    {
        return $customer->passkeys()->create(['name' => 'This phone', 'credential_id' => $credentialId, 'credential' => ['test' => true]]);
    }

    public function test_registration_options_need_a_customer_session_and_return_a_ceremony(): void
    {
        $this->postJson('/api/customer/auth/passkeys/options')->assertUnauthorized();

        $customer = $this->customer();
        $response = $this->withToken($this->token($customer))->postJson('/api/customer/auth/passkeys/options')->assertOk();
        $this->assertTrue(Str::isUuid($response->json('ceremonyId')));
        $this->assertNotEmpty($response->json('options.challenge'));
        $this->assertSame('thenyatelier.com', $response->json('options.rp.id'));
        $this->assertSame('ama@example.com', $response->json('options.user.name'));
    }

    public function test_a_garbage_registration_is_rejected_and_its_ceremony_cannot_be_reused(): void
    {
        $token = $this->token($this->customer());
        $ceremony = $this->withToken($token)->postJson('/api/customer/auth/passkeys/options')->json('ceremonyId');

        $this->withToken($token)->postJson('/api/customer/auth/passkeys', ['ceremonyId' => $ceremony, 'credential' => self::GARBAGE_CREDENTIAL])
            ->assertUnprocessable()->assertJsonValidationErrors('credential');
        $this->withToken($token)->postJson('/api/customer/auth/passkeys', ['ceremonyId' => $ceremony, 'credential' => self::GARBAGE_CREDENTIAL])
            ->assertUnprocessable()->assertJsonPath('errors.credential.0', 'This passkey request expired. Try again.');
        $this->assertDatabaseCount('passkeys', 0);
    }

    public function test_login_options_work_as_a_guest_and_unknown_ceremonies_are_rejected(): void
    {
        $response = $this->postJson('/api/customer/auth/passkey/login/options')->assertOk();
        $this->assertNotEmpty($response->json('options.challenge'));
        $this->assertSame('thenyatelier.com', $response->json('options.rpId'));

        $this->postJson('/api/customer/auth/passkey/login', ['ceremonyId' => (string) Str::uuid(), 'credential' => self::GARBAGE_CREDENTIAL])
            ->assertUnprocessable()->assertJsonPath('errors.credential.0', 'This passkey request expired. Try again.');

        $this->postJson('/api/customer/auth/passkey/login', ['ceremonyId' => $response->json('ceremonyId'), 'credential' => self::GARBAGE_CREDENTIAL])
            ->assertUnprocessable()->assertJsonValidationErrors('credential');
    }

    public function test_login_ceremonies_expire_after_five_minutes(): void
    {
        $ceremony = $this->postJson('/api/customer/auth/passkey/login/options')->json('ceremonyId');
        $this->travel(6)->minutes();
        $this->postJson('/api/customer/auth/passkey/login', ['ceremonyId' => $ceremony, 'credential' => self::GARBAGE_CREDENTIAL])
            ->assertUnprocessable()->assertJsonPath('errors.credential.0', 'This passkey request expired. Try again.');
    }

    public function test_status_is_enrolled_once_a_passkey_exists_and_passkeys_are_listed(): void
    {
        $customer = $this->customer();
        $token = $this->token($customer);
        $this->withToken($token)->getJson('/api/customer/auth/me')->assertJsonPath('customer.passkey.status', 'not_yet');

        $this->addPasskey($customer);
        $this->withToken($token)->getJson('/api/customer/auth/me')->assertJsonPath('customer.passkey.status', 'enrolled');
        $this->withToken($token)->getJson('/api/customer/auth/passkeys')->assertOk()
            ->assertJsonCount(1, 'passkeys')->assertJsonPath('passkeys.0.name', 'This phone');
    }

    public function test_a_phone_code_session_cannot_remove_a_passkey_but_an_email_session_can(): void
    {
        $customer = $this->customer();
        $passkey = $this->addPasskey($customer);

        $this->withToken($this->token($customer, 'phone'))->deleteJson("/api/customer/auth/passkeys/{$passkey->id}")
            ->assertForbidden()->assertJsonPath('message', 'For your security, sign in with your email or passkey to remove a passkey.');
        $this->assertDatabaseHas('passkeys', ['id' => $passkey->id]);

        $this->app['auth']->forgetGuards();
        $this->withToken($this->token($customer, 'email'))->deleteJson("/api/customer/auth/passkeys/{$passkey->id}")
            ->assertOk()->assertJsonPath('customer.passkey.status', 'not_yet');
        $this->assertDatabaseMissing('passkeys', ['id' => $passkey->id]);
        $this->assertDatabaseHas('customer_auth_events', ['customer_id' => $customer->id, 'type' => 'passkey_removed']);
    }

    public function test_a_customer_cannot_remove_another_customers_passkey(): void
    {
        $other = $this->addPasskey($this->customer('kofi@example.com'));
        $this->withToken($this->token($this->customer()))->deleteJson("/api/customer/auth/passkeys/{$other->id}")->assertNotFound();
        $this->assertDatabaseHas('passkeys', ['id' => $other->id]);
    }

    public function test_a_code_sign_in_when_a_passkey_exists_is_logged_and_emailed(): void
    {
        $customer = $this->customer();
        $this->addPasskey($customer);

        $challenge = $this->postJson('/api/customer/auth/start', ['channel' => 'email', 'destination' => 'ama@example.com'])->assertCreated()->json();
        $code = null;
        Mail::assertSent(CustomerSignInCodeMail::class, function (CustomerSignInCodeMail $mail) use (&$code) {
            $code = $mail->code;

            return true;
        });

        $this->postJson('/api/customer/auth/verify', ['challengeId' => $challenge['challengeId'], 'code' => $code])
            ->assertOk()->assertJsonPath('customer.passkey.status', 'enrolled');
        $this->assertDatabaseHas('customer_auth_events', ['customer_id' => $customer->id, 'type' => 'fallback_sign_in', 'channel' => 'email']);
        Mail::assertSent(CustomerSignInAlertMail::class, fn (CustomerSignInAlertMail $mail) => $mail->hasTo('ama@example.com') && $mail->channel === 'email');
    }

    public function test_a_code_sign_in_without_a_passkey_sends_no_alert(): void
    {
        $this->customer();
        $challenge = $this->postJson('/api/customer/auth/start', ['channel' => 'email', 'destination' => 'ama@example.com'])->json();
        $code = null;
        Mail::assertSent(CustomerSignInCodeMail::class, function (CustomerSignInCodeMail $mail) use (&$code) {
            $code = $mail->code;

            return true;
        });
        $this->postJson('/api/customer/auth/verify', ['challengeId' => $challenge['challengeId'], 'code' => $code])->assertOk();
        Mail::assertNotSent(CustomerSignInAlertMail::class);
        $this->assertDatabaseMissing('customer_auth_events', ['type' => 'fallback_sign_in']);
    }

    public function test_staff_tokens_are_rejected_on_customer_passkey_routes(): void
    {
        $this->signInStaff();
        $this->getJson('/api/customer/auth/passkeys')->assertUnauthorized();
        $this->postJson('/api/customer/auth/passkeys/options')->assertUnauthorized();
        $this->deleteJson('/api/customer/auth/passkeys/1')->assertUnauthorized();
    }
}
