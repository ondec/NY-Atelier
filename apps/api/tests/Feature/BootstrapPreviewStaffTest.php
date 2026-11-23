<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class BootstrapPreviewStaffTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_sign_in_accounts_for_the_three_configured_roles(): void
    {
        config(['preview.enabled' => true, 'preview.password' => 'PreviewAccount2468!', 'preview.accounts' => [
            'owner' => 'owner@example.test', 'manager' => 'manager@example.test', 'receptionist' => 'reception@example.test',
        ]]);

        $this->artisan('staff:bootstrap-preview')->assertSuccessful();

        $this->assertDatabaseCount('users', 3);
        $this->assertDatabaseCount('staff_members', 3);
        $this->assertDatabaseCount('staff_activation_tokens', 0);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        foreach (['owner' => 'owner', 'manager' => 'manager', 'receptionist' => 'reception'] as $role => $email) {
            $this->postJson('/api/staff/auth/login', ['email' => "$email@example.test", 'password' => 'PreviewAccount2468!'])
                ->assertOk()->assertJsonPath('staff.role', $role);
        }
    }

    public function test_redeploy_does_not_reset_a_password_reactivate_or_promote_an_existing_user(): void
    {
        $user = User::factory()->create(['email' => 'owner@example.test', 'password' => 'OriginalAccount2468!']);
        $user->forceFill(['staff_role' => 'receptionist', 'staff_active' => false])->save();
        $token = $user->createToken('existing', ['staff']);
        config(['preview.enabled' => true, 'preview.password' => 'PreviewAccount2468!', 'preview.accounts' => ['owner' => 'OWNER@example.test']]);

        $this->artisan('staff:bootstrap-preview')->assertSuccessful();

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'staff_role' => 'receptionist', 'staff_active' => false]);
        $this->assertTrue(Hash::check('OriginalAccount2468!', $user->fresh()->password));
        $this->assertModelExists($token->accessToken);
    }

    public static function invalidConfiguration(): array
    {
        return [
            'disabled' => [false, 'PreviewAccount2468!', ['owner' => 'owner@example.test']],
            'no password' => [true, null, ['owner' => 'owner@example.test']],
            'short password' => [true, 'short', ['owner' => 'owner@example.test']],
            'no accounts' => [true, 'PreviewAccount2468!', []],
            'invalid email' => [true, 'PreviewAccount2468!', ['owner' => 'owner@example.test', 'manager' => 'invalid']],
            'duplicate roles email' => [true, 'PreviewAccount2468!', ['owner' => 'owner@example.test', 'manager' => 'OWNER@example.test']],
            'unknown role' => [true, 'PreviewAccount2468!', ['admin' => 'owner@example.test']],
        ];
    }

    #[DataProvider('invalidConfiguration')]
    public function test_refuses_invalid_configuration_without_creating_accounts(bool $enabled, ?string $password, array $accounts): void
    {
        config(['preview.enabled' => $enabled, 'preview.password' => $password, 'preview.accounts' => $accounts]);

        $this->artisan('staff:bootstrap-preview')->assertFailed();

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('staff_members', 0);
    }
}
