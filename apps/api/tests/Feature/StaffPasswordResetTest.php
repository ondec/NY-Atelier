<?php

namespace Tests\Feature;

use App\Mail\StaffPasswordResetMail;
use App\Models\User;
use App\StaffPasswordReset;
use App\StaffTeam;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class StaffPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private const FORGOT = '/api/staff/auth/forgot-password';

    private const RESET = '/api/staff/auth/reset-password';

    private const OLD_PASSWORD = 'PreviousStaff1234!';

    private const NEW_PASSWORD = 'UpdatedStaff5678!';

    protected function setUp(): void
    {
        parent::setUp();
        config(['mail.default' => 'smtp', 'staff.portal_url' => 'https://staff.example.test']);
    }

    private function account(?string $role = 'records', bool $active = true): User
    {
        $user = User::factory()->create(['email' => 'Staff+Record@example.test', 'password' => self::OLD_PASSWORD]);
        $user->forceFill(['staff_role' => $role, 'staff_active' => $active])->save();

        return $user;
    }

    private function requestToken(User $user): string
    {
        $this->postJson(self::FORGOT, ['email' => strtolower($user->email), 'next' => 'studio'])->assertOk();
        $token = null;
        Mail::assertSent(StaffPasswordResetMail::class, function (StaffPasswordResetMail $mail) use (&$token): bool {
            parse_str(parse_url($mail->url, PHP_URL_FRAGMENT), $fragment);
            $token = $fragment['token'];

            return true;
        });
        $this->assertIsString($token);

        return $token;
    }

    private function payload(User $user, string $token): array
    {
        return ['email' => strtolower($user->email), 'token' => $token, 'password' => self::NEW_PASSWORD,
            'password_confirmation' => self::NEW_PASSWORD, 'role' => 'owner', 'staff_active' => true];
    }

    public static function roles(): array
    {
        return [['owner'], ['manager'], ['receptionist'], ['records']];
    }

    #[DataProvider('roles')]
    public function test_active_staff_can_reset_once_without_changing_their_role_and_all_old_sessions_are_revoked(string $role): void
    {
        $this->freezeTime();
        Mail::fake();
        $user = $this->account($role);
        $oldSession = $user->createToken('Other device', ['staff'], now()->addHours(8))->plainTextToken;
        $user->createToken('Second device', ['staff'], now()->addHours(8));
        $token = $this->requestToken($user);
        $stored = DB::table('password_reset_tokens')->where('email', $user->email)->value('token');
        $this->assertNotSame($token, $stored);
        $this->assertTrue(Hash::check($token, $stored));
        $this->postJson(self::RESET, $this->payload($user, $token))->assertOk()
            ->assertJsonPath('message', 'Your password has been reset. Sign in with your new password.')
            ->assertJsonMissingPath('token')->assertHeader('Cache-Control', 'no-store, private');
        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $user->fresh()->password));
        $this->assertSame($role, $user->fresh()->staff_role);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->withToken($oldSession)->getJson('/api/staff/auth/me')->assertUnauthorized();
        Auth::forgetGuards();
        $this->postJson(self::RESET, $this->payload($user, $token))->assertUnprocessable()->assertJsonPath('message', StaffPasswordReset::INVALID_MESSAGE);
        $this->postJson('/api/staff/auth/login', ['email' => $user->email, 'password' => self::OLD_PASSWORD])->assertUnauthorized();
        $this->postJson('/api/staff/auth/login', ['email' => $user->email, 'password' => self::NEW_PASSWORD])->assertOk()->assertJsonPath('staff.role', $role);
    }

    public function test_request_is_generic_for_unknown_nonstaff_pending_and_deactivated_accounts(): void
    {
        Mail::fake();
        $inactive = $this->account('records', false);
        $regular = User::factory()->create();
        $deactivated = User::factory()->create();
        $deactivated->forceFill(['staff_role' => 'manager', 'staff_active' => false, 'staff_deactivated_at' => now()])->save();
        foreach ([$inactive->email, $regular->email, $deactivated->email, 'missing@example.test', "o'brien+test@example.test"] as $email) {
            $this->postJson(self::FORGOT, ['email' => $email])->assertOk()->assertExactJson(['message' => StaffPasswordReset::REQUEST_MESSAGE]);
        }
        Mail::assertNothingSent();
        $this->assertDatabaseCount('password_reset_tokens', 0);
    }

    public function test_mail_uses_the_configured_origin_and_fragment_and_resends_replace_old_links_after_throttle(): void
    {
        $this->freezeTime();
        Mail::fake();
        $user = $this->account();
        $first = $this->requestToken($user);
        Mail::assertSent(StaffPasswordResetMail::class, function (StaffPasswordResetMail $mail) use ($user): bool {
            return $mail->hasTo($user->email) && str_starts_with($mail->url, 'https://staff.example.test/staff/reset-password?next=studio#token=')
                && str_contains($mail->url, '&email=Staff%2BRecord%40example.test') && $mail->minutes === 60;
        });
        $this->postJson(self::FORGOT, ['email' => $user->email])->assertOk()->assertExactJson(['message' => StaffPasswordReset::REQUEST_MESSAGE]);
        Mail::assertSentCount(1);
        $this->travel(61)->seconds();
        Mail::fake();
        $second = $this->requestToken($user);
        $this->assertNotSame($first, $second);
        $this->postJson(self::RESET, $this->payload($user, $first))->assertUnprocessable();
        $this->postJson(self::RESET, $this->payload($user, $second))->assertOk();
    }

    public function test_expired_wrong_token_and_wrong_email_leave_the_password_and_sessions_unchanged(): void
    {
        $this->freezeTime();
        Mail::fake();
        $user = $this->account();
        $user->createToken('Device', ['staff']);
        $token = $this->requestToken($user);
        $this->postJson(self::RESET, $this->payload($user, str_repeat('0', 64)))->assertUnprocessable()->assertJsonPath('message', StaffPasswordReset::INVALID_MESSAGE);
        $this->postJson(self::RESET, [...$this->payload($user, $token), 'email' => 'someone-else@example.test'])->assertUnprocessable()->assertJsonPath('message', StaffPasswordReset::INVALID_MESSAGE);
        $this->travel(61)->minutes();
        $this->postJson(self::RESET, $this->payload($user, $token))->assertUnprocessable()->assertJsonPath('message', StaffPasswordReset::INVALID_MESSAGE);
        $this->assertTrue(Hash::check(self::OLD_PASSWORD, $user->fresh()->password));
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_a_reset_link_never_activates_an_inactive_or_nonstaff_account(): void
    {
        $user = $this->account('records', false);
        $token = Password::broker('staff')->createToken($user);
        $this->postJson(self::RESET, $this->payload($user, $token))->assertUnprocessable();
        $user->forceFill(['staff_role' => null, 'staff_active' => true])->save();
        $this->postJson(self::RESET, $this->payload($user, $token))->assertUnprocessable();
        $this->assertTrue(Hash::check(self::OLD_PASSWORD, $user->fresh()->password));
    }

    public function test_deactivation_invalidates_a_link_even_after_reactivation(): void
    {
        Mail::fake();
        $user = $this->account();
        $owner = User::factory()->create();
        $owner->forceFill(['staff_role' => 'owner', 'staff_active' => true])->save();
        $memberId = DB::table('staff_members')->insertGetId(['user_id' => $user->id, 'name' => $user->name, 'job_title' => 'Customer records', 'salary_eligible' => false, 'sort_order' => 200, 'created_at' => now(), 'updated_at' => now()]);
        $token = $this->requestToken($user);
        $team = new StaffTeam;
        $team->deactivate($owner, $memberId);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        $team->reactivate($owner, $memberId);
        $this->postJson(self::RESET, $this->payload($user, $token))->assertUnprocessable();
        $this->assertTrue(Hash::check(self::OLD_PASSWORD, $user->fresh()->password));
    }

    public function test_log_mailer_never_exposes_a_recovery_link_and_delivery_errors_do_not_reveal_the_account(): void
    {
        Mail::fake();
        $user = $this->account();
        config(['mail.default' => 'log']);
        $this->postJson(self::FORGOT, ['email' => $user->email])->assertOk()->assertExactJson(['message' => StaffPasswordReset::REQUEST_MESSAGE]);
        Mail::assertNothingSent();
        $this->assertDatabaseCount('password_reset_tokens', 0);
        config(['mail.default' => 'smtp']);
        Mail::shouldReceive('to')->once()->andThrow(new RuntimeException('A provider URL with a token must never be logged.'));
        Log::shouldReceive('warning')->once()->with('Staff password reset email could not be sent.', ['exception' => RuntimeException::class]);
        $this->postJson(self::FORGOT, ['email' => $user->email])->assertOk()->assertExactJson(['message' => StaffPasswordReset::REQUEST_MESSAGE]);
    }

    public function test_invalid_input_and_password_policy_are_enforced_without_consuming_the_link(): void
    {
        Mail::fake();
        $user = $this->account();
        $token = $this->requestToken($user);
        $this->postJson(self::FORGOT, ['email' => 'bad', 'next' => 'https://untrusted.test'])->assertUnprocessable()->assertJsonValidationErrors(['email', 'next']);
        $this->postJson(self::RESET, [])->assertUnprocessable()->assertJsonValidationErrors(['email', 'token', 'password']);
        foreach (['short1', 'onlyletterslong', '12345678901234', str_repeat('a', 256).'1'] as $password) {
            $this->postJson(self::RESET, [...$this->payload($user, $token), 'password' => $password, 'password_confirmation' => $password])->assertUnprocessable()->assertJsonValidationErrors('password');
        }
        $this->postJson(self::RESET, [...$this->payload($user, $token), 'password_confirmation' => 'DifferentPassword123'])->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->postJson(self::RESET, [...$this->payload($user, $token), 'token' => 'malformed'])->assertUnprocessable()->assertJsonValidationErrors('token');
        $this->postJson(self::RESET, $this->payload($user, $token))->assertOk();
    }

    public function test_recovery_endpoints_are_rate_limited_for_unknown_accounts_too(): void
    {
        $this->freezeTime();
        Mail::fake();
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson(self::FORGOT, ['email' => 'missing@example.test'])->assertOk();
        }
        $this->postJson(self::FORGOT, ['email' => 'missing@example.test'])->assertTooManyRequests();
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson(self::RESET, ['email' => 'missing@example.test', 'token' => str_repeat('a', 64), 'password' => self::NEW_PASSWORD, 'password_confirmation' => self::NEW_PASSWORD])->assertUnprocessable();
        }
        $this->postJson(self::RESET, [])->assertTooManyRequests();
        Mail::assertNothingSent();
    }

    public function test_recovery_email_renders_the_branded_template_with_escaped_input(): void
    {
        $mail = new StaffPasswordResetMail('staff+<b>@example.test', 'https://staff.example.test/staff/reset-password#token=safe', 60);
        $mail->assertSeeInHtml('Choose a new password');
        $mail->assertSeeInHtml('staff+<b>@example.test');
        $mail->assertSeeInText('expires in 60 minutes');
        $mail->assertSeeInHtml('NY ATELIER');
    }
}
