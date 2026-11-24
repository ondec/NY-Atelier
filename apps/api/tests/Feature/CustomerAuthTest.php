<?php

namespace Tests\Feature;

use App\CustomerSignIn;
use App\CustomerSms;
use App\Mail\CustomerSignInCodeMail;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class CustomerAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['customer_auth.sms_driver' => 'array']);
        CustomerSms::$sent = [];
        RateLimiter::clear('customer-sign-in:'.hash('sha256', 'ama@example.com'));
        Mail::fake();
    }

    private function startEmail(string $email = 'Ama@Example.com'): array
    {
        $challenge = $this->postJson('/api/customer/auth/start', ['channel' => 'email', 'destination' => $email])->assertCreated()->json();
        $mail = null;
        Mail::assertSent(CustomerSignInCodeMail::class, function (CustomerSignInCodeMail $sent) use (&$mail) {
            $mail = $sent;

            return true;
        });

        return [$challenge, $mail];
    }

    public function test_email_code_creates_a_customer_and_a_working_session(): void
    {
        [$challenge, $mail] = $this->startEmail();
        $this->assertSame('a••@example.com', $challenge['destination']);
        $this->assertMatchesRegularExpression('/^\d{6}$/', $mail->code);
        Mail::assertSent(CustomerSignInCodeMail::class, fn ($sent) => $sent->hasTo('ama@example.com'));

        $response = $this->postJson('/api/customer/auth/verify', ['challengeId' => $challenge['challengeId'], 'code' => $mail->code, 'name' => 'Ama Owusu'])
            ->assertOk()
            ->assertJsonPath('customer.email', 'ama@example.com')
            ->assertJsonPath('customer.name', 'Ama Owusu')
            ->assertJsonPath('customer.emailVerified', true)
            ->assertJsonPath('customer.passkey.status', 'not_yet');

        $this->withToken($response->json('token'))->getJson('/api/customer/auth/me')->assertOk()->assertJsonPath('customer.email', 'ama@example.com');
        $this->assertDatabaseHas('customer_auth_events', ['type' => 'signed_in', 'channel' => 'email']);
    }

    public function test_magic_link_token_signs_in_once_and_codes_cannot_be_reused(): void
    {
        [$challenge, $mail] = $this->startEmail();
        parse_str(parse_url($mail->link, PHP_URL_QUERY), $query);
        $this->assertSame($challenge['challengeId'], $query['challenge']);

        $this->postJson('/api/customer/auth/verify', ['challengeId' => $query['challenge'], 'token' => $query['token']])->assertOk();
        $this->postJson('/api/customer/auth/verify', ['challengeId' => $query['challenge'], 'token' => $query['token']])->assertUnprocessable();
        $this->postJson('/api/customer/auth/verify', ['challengeId' => $query['challenge'], 'code' => $mail->code])->assertUnprocessable();
    }

    public function test_email_link_opens_an_https_page_that_hands_the_link_to_the_app(): void
    {
        config(['customer_auth.link_base' => 'https://api.example.test/api/customer/auth/link', 'customer_auth.app_link_base' => 'nyatelier://sign-in']);
        [$challenge, $mail] = $this->startEmail();
        $this->assertStringStartsWith('https://api.example.test/api/customer/auth/link?', $mail->link);
        parse_str(parse_url($mail->link, PHP_URL_QUERY), $query);

        $page = $this->get('/api/customer/auth/link?'.http_build_query($query))->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        $page->assertSee('nyatelier://sign-in?challenge='.$challenge['challengeId'].'&amp;token='.$query['token'], false);

        // Opening the page does not use up the link; the app still signs in with it.
        $this->postJson('/api/customer/auth/verify', ['challengeId' => $query['challenge'], 'token' => $query['token']])->assertOk();
    }

    public function test_incomplete_email_link_page_does_not_open_the_app(): void
    {
        $this->get('/api/customer/auth/link?challenge=nope&token=bad')->assertNotFound()->assertDontSee('nyatelier://', false);
    }

    public function test_verified_email_links_the_existing_studio_customer_instead_of_creating_a_duplicate(): void
    {
        $studio = Customer::query()->create(['name' => 'Kofi Asante', 'email' => 'ama@example.com']);
        [$challenge, $mail] = $this->startEmail('AMA@example.com');

        $this->postJson('/api/customer/auth/verify', ['challengeId' => $challenge['challengeId'], 'code' => $mail->code, 'name' => 'Someone else'])
            ->assertOk()->assertJsonPath('customer.id', $studio->id)->assertJsonPath('customer.name', 'Kofi Asante');
        $this->assertSame(1, Customer::query()->count());
    }

    public function test_phone_code_normalizes_ghana_numbers_and_matches_an_existing_customer(): void
    {
        $studio = Customer::query()->create(['name' => 'Efua Mensah', 'phone' => '024 123 4567']);
        $this->assertSame('+233241234567', $studio->fresh()->phone_e164);

        $challenge = $this->postJson('/api/customer/auth/start', ['channel' => 'phone', 'destination' => '+233 24 123 4567'])->assertCreated()->json();
        $this->assertCount(1, CustomerSms::$sent);
        $this->assertSame('+233241234567', CustomerSms::$sent[0]['to']);
        preg_match('/\b(\d{6})\b/', CustomerSms::$sent[0]['message'], $match);

        $token = $this->postJson('/api/customer/auth/verify', ['challengeId' => $challenge['challengeId'], 'code' => $match[1]])
            ->assertOk()->assertJsonPath('customer.id', $studio->id)->assertJsonPath('customer.phoneVerified', true)->json('token');
        $this->assertTrue(Customer::query()->find($studio->id)->tokens()->first()->can('channel:phone'));
        $this->assertNotEmpty($token);
    }

    public function test_phone_numbers_are_normalized(): void
    {
        $this->assertSame('+233241234567', CustomerSignIn::normalizePhone('0241234567'));
        $this->assertSame('+233241234567', CustomerSignIn::normalizePhone('233241234567'));
        $this->assertSame('+233241234567', CustomerSignIn::normalizePhone('241234567'));
        $this->assertSame('+447700900123', CustomerSignIn::normalizePhone('+44 7700 900123'));
        $this->assertSame('+447700900123', CustomerSignIn::normalizePhone('0044 7700 900123'));
        $this->assertNull(CustomerSignIn::normalizePhone('12'));
        $this->postJson('/api/customer/auth/start', ['channel' => 'phone', 'destination' => '12'])->assertUnprocessable();
    }

    public function test_wrong_codes_are_limited_and_expired_codes_are_rejected(): void
    {
        [$challenge, $mail] = $this->startEmail();
        $wrong = $mail->code === '000000' ? '111111' : '000000';
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/customer/auth/verify', ['challengeId' => $challenge['challengeId'], 'code' => $wrong])->assertUnprocessable();
        }
        $this->postJson('/api/customer/auth/verify', ['challengeId' => $challenge['challengeId'], 'code' => $mail->code])
            ->assertUnprocessable()->assertJsonPath('errors.code.0', 'Too many incorrect attempts. Request a new code.');

        [$second, $mail] = $this->startEmail();
        $this->travel(16)->minutes();
        $this->postJson('/api/customer/auth/verify', ['challengeId' => $second['challengeId'], 'code' => $mail->code])->assertUnprocessable();
        $this->assertSame(0, Customer::query()->count());
    }

    public function test_a_new_code_replaces_the_previous_one(): void
    {
        [$first, $firstMail] = $this->startEmail();
        Mail::fake();
        [$second, $secondMail] = $this->startEmail();

        $this->postJson('/api/customer/auth/verify', ['challengeId' => $first['challengeId'], 'code' => $firstMail->code])->assertUnprocessable();
        $this->postJson('/api/customer/auth/verify', ['challengeId' => $second['challengeId'], 'code' => $secondMail->code])->assertOk();
    }

    public function test_start_response_does_not_reveal_whether_an_account_exists(): void
    {
        Customer::query()->create(['name' => 'Existing', 'email' => 'known@example.com']);
        $known = $this->postJson('/api/customer/auth/start', ['channel' => 'email', 'destination' => 'known@example.com'])->assertCreated()->json();
        $unknown = $this->postJson('/api/customer/auth/start', ['channel' => 'email', 'destination' => 'new@example.com'])->assertCreated()->json();

        $this->assertSame(array_keys($known), array_keys($unknown));
        $this->assertSame(1, Customer::query()->count());
    }

    public function test_customer_and_staff_tokens_cannot_cross_into_each_other(): void
    {
        $customer = Customer::query()->create(['name' => 'Token test', 'email' => 'token@example.com']);
        $customerToken = $customer->createToken('test', ['customer'])->plainTextToken;
        $this->withToken($customerToken)->getJson('/api/demo/staff/orders')->assertForbidden();
        $this->withToken($customerToken)->getJson('/api/staff/auth/me')->assertForbidden();

        $this->app['auth']->forgetGuards();
        $this->signInStaff();
        $this->getJson('/api/customer/auth/me')->assertUnauthorized();
    }

    public function test_passkey_is_offered_after_an_order_and_required_after_thirty_days(): void
    {
        [$challenge, $mail] = $this->startEmail();
        $token = $this->postJson('/api/customer/auth/verify', ['challengeId' => $challenge['challengeId'], 'code' => $mail->code])->json('token');
        $customer = Customer::query()->firstOrFail();
        $customer->orders()->create(['reference' => 'NY-TEST-1', 'category' => 'Ready-to-Wear', 'status' => 'New']);

        $this->withToken($token)->getJson('/api/customer/auth/me')->assertJsonPath('customer.passkey.status', 'offer');
        $this->travel(31)->days();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/customer/auth/me')->assertJsonPath('customer.passkey.status', 'required');
    }

    public function test_sign_out_revokes_the_session_and_name_can_be_updated(): void
    {
        [$challenge, $mail] = $this->startEmail();
        $token = $this->postJson('/api/customer/auth/verify', ['challengeId' => $challenge['challengeId'], 'code' => $mail->code])->json('token');

        $this->withToken($token)->patchJson('/api/customer/auth/me', ['name' => 'Ama Owusu'])->assertOk()->assertJsonPath('customer.name', 'Ama Owusu');
        $this->withToken($token)->postJson('/api/customer/auth/logout')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/customer/auth/me')->assertUnauthorized();
    }
}
