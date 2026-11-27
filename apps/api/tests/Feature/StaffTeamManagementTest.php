<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class StaffTeamManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['demo.enabled' => false, 'mail.default' => 'log', 'staff.portal_url' => 'https://staff.example.test']);
        Mail::fake();
    }

    /** @return array{0: User, 1: int} */
    private function member(string $role = 'receptionist', bool $active = true): array
    {
        $user = User::factory()->create(['password' => 'KeepThisPassword1']);
        $user->forceFill(['staff_role' => $role, 'staff_active' => $active])->save();
        $id = DB::table('staff_members')->insertGetId(['user_id' => $user->id, 'name' => $user->name, 'job_title' => ucfirst($role), 'salary_eligible' => false,
            'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()]);

        return [$user, $id];
    }

    private function url(int $member, string $action): string
    {
        return "/api/demo/staff/team/{$member}/{$action}";
    }

    public function test_the_owner_changes_a_role_and_it_applies_to_the_open_session_immediately(): void
    {
        [$user, $id] = $this->member('receptionist');
        $user->createToken('session', ['staff']);
        $this->signInStaff();
        $this->patchJson($this->url($id, 'role'), ['role' => 'records'])->assertOk()
            ->assertJsonPath('member.role', 'records')->assertJsonPath('member.role_label', 'Customer records')->assertJsonPath('member.job_title', 'Customer records');
        $this->assertDatabaseCount('personal_access_tokens', 1);

        Auth::forgetGuards();
        Sanctum::actingAs($user->refresh(), ['staff']);
        $this->getJson('/api/demo/staff/orders')->assertForbidden();
        $this->getJson('/api/demo/staff/customers')->assertOk();
    }

    public function test_deactivation_signs_the_person_out_blocks_sign_in_and_reactivation_restores_it(): void
    {
        [$user, $id] = $this->member('manager');
        $user->createToken('session', ['staff']);
        $hash = $user->password;
        $this->signInStaff();
        $this->postJson($this->url($id, 'deactivate'))->assertOk()->assertJsonPath('member.status', 'deactivated')->assertJsonPath('member.can_reinvite', false);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->postJson($this->url($id, 'deactivate'))->assertConflict();
        $this->postJson($this->url($id, 'invitation'))->assertConflict();
        $this->postJson('/api/demo/staff/team/invitations', ['name' => 'Again', 'email' => $user->email, 'role' => 'records'])->assertConflict();

        Auth::forgetGuards();
        $this->postJson('/api/staff/auth/login', ['email' => $user->email, 'password' => 'KeepThisPassword1'])->assertUnauthorized();

        $this->signInStaff();
        $this->postJson($this->url($id, 'reactivate'))->assertOk()->assertJsonPath('member.status', 'active');
        $this->assertSame($hash, $user->refresh()->password);
        Auth::forgetGuards();
        $this->postJson('/api/staff/auth/login', ['email' => $user->email, 'password' => 'KeepThisPassword1'])->assertOk()->assertJsonPath('staff.role', 'manager');
    }

    public function test_a_pending_invitation_can_be_cancelled_and_reactivating_it_needs_a_new_invitation(): void
    {
        $this->signInStaff();
        $invited = $this->postJson('/api/demo/staff/team/invitations', ['name' => 'Esi', 'email' => 'esi@example.test', 'role' => 'records'])->json();
        $token = explode('#token=', $invited['setupUrl'])[1];
        $id = $invited['member']['id'];
        $this->postJson($this->url($id, 'deactivate'))->assertOk()->assertJsonPath('member.status', 'deactivated');
        $this->postJson('/api/staff/auth/activation', ['token' => $token])->assertUnprocessable();
        $this->postJson($this->url($id, 'reactivate'))->assertOk()->assertJsonPath('member.status', 'expired')->assertJsonPath('member.can_reinvite', true);
        $this->postJson($this->url($id, 'invitation'))->assertOk()->assertJsonPath('member.status', 'invited');
    }

    public function test_the_owner_cannot_change_their_own_access_or_other_owner_accounts(): void
    {
        $owner = $this->signInStaff();
        $ownId = DB::table('staff_members')->insertGetId(['user_id' => $owner->id, 'name' => 'Me', 'job_title' => 'Owner', 'salary_eligible' => false,
            'sort_order' => 0, 'created_at' => now(), 'updated_at' => now()]);
        [, $otherOwner] = $this->member('owner');
        foreach ([$ownId, $otherOwner] as $id) {
            $this->patchJson($this->url($id, 'role'), ['role' => 'records'])->assertConflict();
            $this->postJson($this->url($id, 'deactivate'))->assertConflict();
        }
        $this->assertTrue($owner->refresh()->staff_active);
        $this->getJson('/api/demo/staff/team')->assertJsonPath('members.0.is_self', true)->assertJsonPath('members.0.manageable', false);
    }

    public function test_roles_are_validated_and_members_without_accounts_cannot_be_changed(): void
    {
        [, $id] = $this->member('receptionist');
        $noAccount = DB::table('staff_members')->insertGetId(['name' => 'Tailor', 'job_title' => 'Tailor', 'salary_eligible' => true,
            'sort_order' => 5, 'created_at' => now(), 'updated_at' => now()]);
        $this->signInStaff();
        $this->patchJson($this->url($id, 'role'), ['role' => 'owner'])->assertUnprocessable()->assertJsonValidationErrors('role');
        $this->postJson($this->url($noAccount, 'deactivate'))->assertNotFound();
        $this->postJson($this->url(999999, 'reactivate'))->assertNotFound();
    }

    public static function nonOwners(): array
    {
        return [['production'], ['receptionist'], ['records']];
    }

    #[DataProvider('nonOwners')]
    public function test_only_the_owner_can_change_roles_or_deactivate(string $role): void
    {
        [$target, $id] = $this->member('receptionist');
        $this->signInStaff($role);
        $this->patchJson($this->url($id, 'role'), ['role' => 'manager'])->assertForbidden();
        $this->postJson($this->url($id, 'deactivate'))->assertForbidden();
        $this->postJson($this->url($id, 'reactivate'))->assertForbidden();
        $this->assertSame('receptionist', $target->refresh()->staff_role);
        $this->assertTrue($target->staff_active);
    }
}
