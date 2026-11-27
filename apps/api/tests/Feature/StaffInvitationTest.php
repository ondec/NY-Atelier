<?php

namespace Tests\Feature;

use App\Mail\StaffInvitationMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class StaffInvitationTest extends TestCase
{
    use RefreshDatabase;

    private const INVITE = '/api/demo/staff/team/invitations';

    protected function setUp(): void
    {
        parent::setUp();
        config(['demo.enabled' => false, 'staff.portal_url' => 'https://staff.example.test']);
    }

    private function tokenFrom(string $url): string
    {
        return explode('#token=', $url)[1];
    }

    private function mailedToken(): string
    {
        $token = null;
        Mail::assertSent(StaffInvitationMail::class, function (StaffInvitationMail $mail) use (&$token): bool {
            $token = $this->tokenFrom($mail->setupUrl);

            return true;
        });

        return $token;
    }

    public function test_the_owner_invites_a_records_member_who_receives_an_email_and_chooses_a_password(): void
    {
        Mail::fake();
        config(['mail.default' => 'microsoft-graph']);
        $this->signInStaff();
        $response = $this->postJson(self::INVITE, ['name' => 'Ama Mensah', 'email' => 'Ama@Example.test', 'role' => 'records'])
            ->assertCreated()->assertJsonPath('delivery', 'sent')->assertJsonPath('setupUrl', null)
            ->assertJsonPath('member.status', 'invited')->assertJsonPath('member.role', 'records')
            ->assertJsonPath('member.role_label', 'Customer records')->assertJsonPath('member.email', 'ama@example.test');
        $this->assertNotNull($response->json('member.invitation_expires_at'));
        Mail::assertSent(StaffInvitationMail::class, fn (StaffInvitationMail $mail): bool => $mail->hasTo('ama@example.test')
            && str_starts_with($mail->setupUrl, 'https://staff.example.test/staff/activate#token='));
        $token = $this->mailedToken();
        $this->assertDatabaseMissing('staff_activation_tokens', ['hash' => $token]);
        $this->assertDatabaseHas('users', ['email' => 'ama@example.test', 'staff_role' => 'records', 'staff_active' => false]);

        Auth::forgetGuards();
        $this->app['auth']->guard('sanctum')->forgetUser();
        $this->postJson('/api/staff/auth/activation', ['token' => $token])->assertOk()->assertJsonPath('role', 'records');
        $this->postJson('/api/staff/auth/activate', ['token' => $token, 'password' => 'RecordsDesk2468', 'password_confirmation' => 'RecordsDesk2468'])
            ->assertOk()->assertJsonPath('staff.role', 'records')->assertJsonPath('staff.officeHref', '/showroom?view=fittings')
            ->assertJsonPath('staff.permissions', ['studio', 'customers']);
        $this->postJson('/api/staff/auth/activate', ['token' => $token, 'password' => 'RecordsDesk2468', 'password_confirmation' => 'RecordsDesk2468'])
            ->assertUnprocessable();
    }

    public function test_without_email_delivery_the_owner_gets_the_link_and_nothing_is_written_to_the_mail_log(): void
    {
        Mail::fake();
        config(['mail.default' => 'log']);
        $this->signInStaff();
        $this->getJson('/api/demo/staff/team')->assertOk()->assertJsonPath('emailDelivery', false);
        $url = $this->postJson(self::INVITE, ['name' => 'Kofi', 'email' => 'kofi@example.test', 'role' => 'receptionist'])
            ->assertCreated()->assertJsonPath('delivery', 'not_configured')->json('setupUrl');
        Mail::assertNothingSent();
        $this->postJson('/api/staff/auth/activation', ['token' => $this->tokenFrom($url)])->assertOk()->assertJsonPath('name', 'Kofi');
    }

    public function test_a_mail_failure_is_reported_and_the_link_is_still_available_to_the_owner(): void
    {
        config(['mail.default' => 'microsoft-graph', 'mail.mailers.microsoft-graph.client_secret' => null]);
        $this->signInStaff();
        $this->postJson(self::INVITE, ['name' => 'Esi', 'email' => 'esi@example.test', 'role' => 'records'])
            ->assertCreated()->assertJsonPath('delivery', 'failed')->assertJsonPath('member.status', 'invited');
    }

    public function test_reinviting_replaces_the_previous_link_and_active_accounts_are_never_changed(): void
    {
        Mail::fake();
        config(['mail.default' => 'log']);
        $owner = $this->signInStaff();
        $first = $this->postJson(self::INVITE, ['name' => 'Yaw', 'email' => 'yaw@example.test', 'role' => 'receptionist'])->json();
        $second = $this->postJson('/api/demo/staff/team/'.$first['member']['id'].'/invitation')->assertOk()->json();
        $this->assertDatabaseCount('staff_activation_tokens', 1);
        $this->postJson('/api/staff/auth/activation', ['token' => $this->tokenFrom($first['setupUrl'])])->assertUnprocessable();
        $this->postJson('/api/staff/auth/activation', ['token' => $this->tokenFrom($second['setupUrl'])])->assertOk();

        // Inviting the same pending email again may correct the name and role before activation.
        $this->postJson(self::INVITE, ['name' => 'Yaw Boateng', 'email' => 'YAW@example.test', 'role' => 'records'])->assertCreated()
            ->assertJsonPath('member.id', $first['member']['id'])->assertJsonPath('member.role', 'records');
        $this->assertDatabaseCount('staff_members', 1);

        $active = User::factory()->create(['email' => 'active@example.test', 'password' => 'KeepThisPassword1']);
        $active->forceFill(['staff_role' => 'manager', 'staff_active' => true])->save();
        $hash = $active->password;
        DB::table('staff_members')->insert(['user_id' => $active->id, 'name' => 'Active', 'job_title' => 'Manager', 'salary_eligible' => false, 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()]);
        $this->postJson(self::INVITE, ['name' => 'Taken', 'email' => 'Active@example.test', 'role' => 'records'])->assertConflict();
        $memberId = DB::table('staff_members')->where('user_id', $active->id)->value('id');
        $this->postJson('/api/demo/staff/team/'.$memberId.'/invitation')->assertConflict();
        $active->refresh();
        $this->assertSame(['manager', true, $hash], [$active->staff_role, $active->staff_active, $active->password]);

        // The owner's own account cannot be re-invited or demoted through an invitation.
        $this->postJson(self::INVITE, ['name' => 'Owner', 'email' => $owner->email, 'role' => 'records'])->assertConflict();
    }

    public function test_expired_invitations_are_refused_and_shown_as_expired(): void
    {
        Mail::fake();
        config(['mail.default' => 'log']);
        $this->signInStaff();
        $url = $this->postJson(self::INVITE, ['name' => 'Abena', 'email' => 'abena@example.test', 'role' => 'records'])->json('setupUrl');
        $this->travel(73)->hours();
        $this->postJson('/api/staff/auth/activation', ['token' => $this->tokenFrom($url)])->assertUnprocessable();
        $this->getJson('/api/demo/staff/team')->assertJsonPath('members.0.status', 'expired')->assertJsonPath('members.0.can_reinvite', true);
    }

    public function test_invitations_validate_their_input_and_cannot_create_owners(): void
    {
        $this->signInStaff();
        $this->postJson(self::INVITE, ['name' => 'X', 'email' => 'not-an-email', 'role' => 'owner'])
            ->assertUnprocessable()->assertJsonValidationErrors(['name', 'email', 'role']);
        $this->assertDatabaseCount('users', 1);
    }

    public static function nonOwners(): array
    {
        return [['production'], ['receptionist'], ['records']];
    }

    #[DataProvider('nonOwners')]
    public function test_only_the_owner_can_invite_or_reinvite(string $role): void
    {
        $this->signInStaff($role);
        $this->postJson(self::INVITE, ['name' => 'Someone', 'email' => 'someone@example.test', 'role' => 'records'])->assertForbidden();
        $this->postJson('/api/demo/staff/team/1/invitation')->assertForbidden();
        $this->getJson('/api/demo/staff/team')->assertForbidden();
        $this->assertDatabaseMissing('users', ['email' => 'someone@example.test']);
    }

    public function test_production_staff_keep_their_session_without_studio_access(): void
    {
        foreach (['production', 'tailor'] as $role) {
            $this->signInStaff($role);
            $this->getJson('/api/staff/auth/me')->assertOk()->assertJsonPath('staff.role', $role)->assertJsonPath('staff.officeHref', '/production');
        }
    }

    public function test_the_records_role_reaches_customer_records_only(): void
    {
        $this->signInStaff('records');
        $this->getJson('/api/staff/auth/me')->assertOk()->assertJsonPath('staff.role', 'records');
        $this->getJson('/api/demo/staff/customers')->assertOk();
        $id = $this->postJson('/api/demo/staff/customers', ['name' => 'Handwritten Record', 'phone' => '+233200000000'])->assertCreated()->json('customer.id');
        $this->getJson('/api/demo/staff/customers/'.$id)->assertOk();
        foreach (['/api/demo/staff/orders', '/api/demo/staff/orders/options', '/api/demo/staff/salaries', '/api/demo/staff/team', '/api/demo/staff/overview',
            '/api/demo/staff/finances/overview', '/api/demo/staff/consultations', '/api/demo/staff/studio/catalogue', '/api/demo/staff/studio/sales'] as $url) {
            $this->getJson($url)->assertForbidden();
        }
        $this->postJson('/api/demo/staff/studio/sales', [])->assertForbidden();
        $this->postJson('/api/demo/staff/studio/sales/quote', [])->assertForbidden();
        $this->postJson('/api/demo/staff/studio/orders', [])->assertForbidden();
        $this->postJson('/api/demo/staff/orders', [])->assertForbidden();
    }

    public function test_the_graph_transport_sends_mime_to_the_configured_mailbox(): void
    {
        Http::fake([
            'login.microsoftonline.com/*' => Http::response(['access_token' => 'graph-test-token', 'expires_in' => 3599]),
            'graph.microsoft.com/*' => Http::response(null, 202),
        ]);
        config(['mail.default' => 'microsoft-graph', 'mail.from.address' => 'no-reply@example.test', 'mail.mailers.microsoft-graph' => [
            'transport' => 'microsoft-graph', 'tenant_id' => 'tenant', 'client_id' => 'client', 'client_secret' => 'secret', 'sender' => 'no-reply@example.test',
        ]]);
        $this->signInStaff();
        $this->postJson(self::INVITE, ['name' => 'Akua', 'email' => 'akua@example.test', 'role' => 'records'])->assertCreated()->assertJsonPath('delivery', 'sent');
        Http::assertSent(fn ($request): bool => $request->url() === 'https://graph.microsoft.com/v1.0/users/no-reply%40example.test/sendMail'
            && $request->hasHeader('Authorization', 'Bearer graph-test-token')
            && str_contains(base64_decode($request->body()), 'akua@example.test'));
    }

    public function test_microsoft_errors_are_logged_with_their_reason_and_the_owner_still_gets_the_link(): void
    {
        Http::fake(['login.microsoftonline.com/*' => Http::response(['error' => 'invalid_client', 'error_description' => 'AADSTS7000215: Invalid client secret provided.'], 401)]);
        Log::spy();
        config(['mail.default' => 'microsoft-graph', 'mail.mailers.microsoft-graph' => [
            'transport' => 'microsoft-graph', 'tenant_id' => 'tenant', 'client_id' => 'client', 'client_secret' => 'wrong-secret', 'sender' => 'no-reply@example.test',
        ]]);
        $this->signInStaff();
        $this->postJson(self::INVITE, ['name' => 'Kwame', 'email' => 'kwame@example.test', 'role' => 'records'])
            ->assertCreated()->assertJsonPath('delivery', 'failed');
        Log::shouldHaveReceived('warning')->withArgs(fn (string $message, array $context): bool => str_contains($context['reason'], 'AADSTS7000215')
            && ! str_contains($context['reason'], 'wrong-secret'));
    }
}
