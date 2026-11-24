<?php

namespace Tests\Feature;

use App\Mail\CustomerSignInCodeMail;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class CustomerPasswordTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'clover-2026';

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        foreach (['ama@example.com'] as $email) {
            RateLimiter::clear('customer-sign-in:'.hash('sha256', $email));
            RateLimiter::clear('customer-password:'.hash('sha256', $email));
        }
    }

    /** Starts an email sign-in with a password and confirms it with the emailed code. */
    private function createAccount(string $password = self::PASSWORD, ?string $name = 'Ama Owusu'): array
    {
        $challenge = $this->postJson('/api/customer/auth/start', ['channel' => 'email', 'destination' => 'Ama@Example.com', 'password' => $password])->assertCreated()->json();
        $code = null;
        Mail::assertSent(CustomerSignInCodeMail::class, function (CustomerSignInCodeMail $mail) use (&$code) {
            $code = $mail->code;

            return true;
        });

        return $this->postJson('/api/customer/auth/verify', ['challengeId' => $challenge['challengeId'], 'code' => $code, 'name' => $name])->assertOk()->json();
    }

    private function login(string $password = self::PASSWORD): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson('/api/customer/auth/login', ['email' => ' AMA@example.com ', 'password' => $password]);
    }

    public function test_the_password_is_saved_only_after_the_email_is_confirmed(): void
    {
        $this->postJson('/api/customer/auth/start', ['channel' => 'email', 'destination' => 'ama@example.com', 'password' => self::PASSWORD])->assertCreated();
        $this->login()->assertUnprocessable()->assertJsonValidationErrors('password');

        RateLimiter::clear('customer-sign-in:'.hash('sha256', 'ama@example.com'));
        $session = $this->createAccount();
        $this->assertTrue($session['customer']['hasPassword']);
        $this->assertNotSame(self::PASSWORD, Customer::query()->sole()->password);

        $this->login()->assertOk()->assertJsonPath('customer.email', 'ama@example.com')->assertJsonStructure(['token', 'expiresAt']);
        $this->assertDatabaseHas('customer_auth_events', ['type' => 'password_added']);
    }

    public function test_wrong_password_and_unknown_email_get_the_same_answer_and_are_limited(): void
    {
        $this->createAccount();
        $wrong = $this->login('not-the-one-1')->assertUnprocessable()->json('errors.password.0');
        $unknown = $this->postJson('/api/customer/auth/login', ['email' => 'nobody@example.com', 'password' => self::PASSWORD])->assertUnprocessable()->json('errors.password.0');
        $this->assertSame($wrong, $unknown);

        for ($i = 0; $i < 7; $i++) {
            $this->login('not-the-one-1');
        }
        $this->login()->assertUnprocessable()->assertJsonPath('errors.password.0', 'Too many attempts. Wait a few minutes, or sign in with an email code.');
    }

    public function test_weak_passwords_and_phone_passwords_are_refused(): void
    {
        $this->postJson('/api/customer/auth/start', ['channel' => 'email', 'destination' => 'ama@example.com', 'password' => 'short'])->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->postJson('/api/customer/auth/start', ['channel' => 'email', 'destination' => 'ama@example.com', 'password' => 'onlyletters'])->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->postJson('/api/customer/auth/start', ['channel' => 'phone', 'destination' => '0241234567', 'password' => self::PASSWORD])->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_resetting_through_the_email_replaces_the_password_and_signs_out_other_devices(): void
    {
        $first = $this->createAccount();
        RateLimiter::clear('customer-sign-in:'.hash('sha256', 'ama@example.com'));
        Mail::fake();

        $this->createAccount('new-clover-77', null);
        $this->assertSame(1, Customer::query()->count());
        $this->app['auth']->forgetGuards();
        $this->withToken($first['token'])->getJson('/api/customer/auth/me')->assertUnauthorized();
        $this->login()->assertUnprocessable();
        $this->login('new-clover-77')->assertOk()->assertJsonPath('customer.name', 'Ama Owusu');
        $this->assertDatabaseHas('customer_auth_events', ['type' => 'password_changed']);
    }

    public function test_signed_in_customers_add_and_change_a_password(): void
    {
        $customer = Customer::query()->create(['name' => 'Ama Owusu', 'email' => 'ama@example.com']);
        $customer->forceFill(['email_verified_at' => now()])->save();
        $token = $customer->createToken('test', ['customer'])->plainTextToken;
        $other = $customer->createToken('other', ['customer'])->plainTextToken;

        $this->withToken($token)->putJson('/api/customer/auth/password', ['password' => self::PASSWORD])->assertOk()->assertJsonPath('customer.hasPassword', true);
        $this->withToken($token)->putJson('/api/customer/auth/password', ['password' => 'another-one-9'])->assertUnprocessable()->assertJsonValidationErrors('currentPassword');
        $this->withToken($token)->putJson('/api/customer/auth/password', ['currentPassword' => self::PASSWORD, 'password' => 'another-one-9'])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/customer/auth/me')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($other)->getJson('/api/customer/auth/me')->assertUnauthorized();
        $this->login('another-one-9')->assertOk();
    }

    public function test_the_password_never_appears_in_responses(): void
    {
        $session = $this->createAccount();
        $this->assertArrayNotHasKey('password', $session['customer']);
        $this->assertArrayNotHasKey('password', Customer::query()->sole()->toArray());
    }
}
