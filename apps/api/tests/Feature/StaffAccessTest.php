<?php

namespace Tests\Feature;

use App\Models\User;
use App\StaffAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class StaffAccessTest extends TestCase
{
    use RefreshDatabase;

    private function account(string $role = 'owner', bool $active = true): User
    {
        $user = User::factory()->create(['password' => 'PreviewAccount2468!']);
        $user->forceFill(['staff_role' => $role, 'staff_active' => $active])->save();

        return $user;
    }

    public static function roles(): array
    {
        return [['owner'], ['manager'], ['receptionist']];
    }

    #[DataProvider('roles')]
    public function test_named_staff_sign_in_returns_only_their_own_role_and_office(string $role): void
    {
        $user = $this->account($role);
        $response = $this->postJson('/api/staff/auth/login', ['email' => $user->email, 'password' => 'PreviewAccount2468!', 'role' => 'owner'])->assertOk()->assertJsonPath('staff.role', $role)->assertJsonPath('staff.officeHref', '/office/'.$role);
        $token = $response->json('token');
        $this->assertDatabaseCount('personal_access_tokens', 1);
        $this->assertFalse(str_contains(DB::table('personal_access_tokens')->value('token'), $token));
        Auth::forgetGuards();
        $this->withToken($token)->getJson('/api/staff/auth/me')->assertOk()->assertJsonPath('staff.id', $user->id);
    }

    public function test_inactive_nonstaff_and_incorrect_credentials_do_not_create_sessions(): void
    {
        $inactive = $this->account('manager', false);
        $regular = User::factory()->create(['password' => 'PreviewAccount2468!']);
        foreach ([$inactive->email, $regular->email, 'unknown@example.test'] as $email) {
            $this->postJson('/api/staff/auth/login', ['email' => $email, 'password' => 'PreviewAccount2468!'])->assertUnauthorized();
        }
        $this->postJson('/api/staff/auth/login', ['email' => $inactive->email, 'password' => 'wrong-password'])->assertUnauthorized();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_rate_limiting_and_session_expiry_revocation_and_deactivation_are_enforced(): void
    {
        $this->freezeTime();
        $user = $this->account();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/staff/auth/login', ['email' => $user->email, 'password' => 'incorrect-password'])->assertUnauthorized();
        }
        $this->postJson('/api/staff/auth/login', ['email' => $user->email, 'password' => 'PreviewAccount2468!'])->assertTooManyRequests();
        $this->travel(61)->seconds();
        $token = $this->postJson('/api/staff/auth/login', ['email' => $user->email, 'password' => 'PreviewAccount2468!'])->assertOk()->json('token');
        Auth::forgetGuards();
        $this->withToken($token)->postJson('/api/staff/auth/logout')->assertOk();
        Auth::forgetGuards();
        $this->getJson('/api/staff/auth/me')->assertUnauthorized();
        $expired = $user->createToken('expired', ['staff'], now()->subMinute())->plainTextToken;
        Auth::forgetGuards();
        $this->withToken($expired)->getJson('/api/staff/auth/me')->assertUnauthorized();
        $valid = $user->createToken('active', ['staff'], now()->addHour())->plainTextToken;
        $user->staff_active = false;
        $user->save();
        Auth::forgetGuards();
        $this->withToken($valid)->getJson('/api/staff/auth/me')->assertForbidden();
    }

    #[DataProvider('roles')]
    public function test_permission_gates_match_the_staff_role_and_token_abilities(string $role): void
    {
        $user = $this->signInStaff($role);
        foreach (array_unique(array_merge(...array_values(StaffAccess::PERMISSIONS))) as $permission) {
            $this->assertSame(in_array($permission, StaffAccess::PERMISSIONS[$role], true), Gate::forUser($user)->allows('staff.'.$permission));
        }
        Sanctum::actingAs($user, ['customer']);
        $this->assertFalse(Gate::forUser($user)->allows('staff.studio'));
    }

    public function test_guests_have_no_staff_api_access_even_from_loopback(): void
    {
        config(['demo.enabled' => true]);
        foreach (['/api/staff/auth/me', '/api/demo/staff/customers', '/api/demo/staff/orders', '/api/demo/staff/team', '/api/demo/staff/salaries', '/api/demo/staff/studio/catalogue', '/api/demo/staff/studio/sales'] as $path) {
            $this->getJson($path)->assertUnauthorized();
        }
        $this->postJson('/api/demo/staff/studio/sales', [])->assertUnauthorized();
        $this->patchJson('/api/demo/consultations/'.Str::uuid().'/staff', [])->assertUnauthorized();
    }

    public function test_reception_cannot_manage_payroll_catalogue_custom_orders_or_owner_team(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff('receptionist');
        $this->seed();
        $this->getJson('/api/demo/staff/team')->assertForbidden();
        $this->getJson('/api/demo/staff/salaries')->assertForbidden();
        $this->postJson('/api/demo/staff/studio/catalogue', [])->assertForbidden();
        $this->patchJson('/api/demo/staff/orders/NY-RTW-000001/workflow', [])->assertForbidden();
        $this->getJson('/api/demo/staff/orders')->assertOk()->assertJsonPath('orders.0.workflow.can_manage', false);
        $customer = DB::table('customers')->first();
        $this->postJson('/api/demo/staff/orders', ['request_id' => (string) Str::uuid(), 'category' => 'Custom', 'customer_id' => $customer->id, 'service_offering' => 'bespoke', 'items' => [['garment_name' => 'Suit']]])->assertForbidden();
        $this->postJson('/api/demo/staff/orders', ['request_id' => (string) Str::uuid(), 'category' => 'Alterations', 'customer_id' => $customer->id, 'items' => [['garment_name' => 'Trouser adjustment']]])->assertCreated();
        $this->getJson('/api/demo/staff/customers')->assertOk();
        $this->getJson('/api/demo/staff/studio/catalogue')->assertOk();
    }

    public function test_manager_can_manage_operations_but_not_owner_team(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff('manager');
        $this->getJson('/api/demo/staff/salaries')->assertOk();
        $this->getJson('/api/demo/staff/team')->assertForbidden();
        $this->getJson('/api/demo/staff/studio/catalogue')->assertOk();
    }

    public function test_account_setup_links_are_one_use_and_role_cannot_be_changed_in_the_form(): void
    {
        $user = $this->account('receptionist', false);
        $token = bin2hex(random_bytes(32));
        DB::table('staff_activation_tokens')->insert(['hash' => hash('sha256', $token), 'user_id' => $user->id, 'expires_at' => now()->addHour()]);
        $this->postJson('/api/staff/auth/activation', ['token' => $token])->assertOk()->assertJsonPath('role', 'receptionist');
        $payload = ['token' => $token, 'password' => 'NewPreviewAccount2468!', 'password_confirmation' => 'NewPreviewAccount2468!', 'role' => 'owner'];
        $this->postJson('/api/staff/auth/activate', $payload)->assertOk()->assertJsonPath('staff.role', 'receptionist');
        $this->assertTrue(Hash::check('NewPreviewAccount2468!', $user->fresh()->password));
        $this->assertDatabaseMissing('staff_activation_tokens', ['user_id' => $user->id]);
        $this->postJson('/api/staff/auth/activate', $payload)->assertUnprocessable();
    }
}
