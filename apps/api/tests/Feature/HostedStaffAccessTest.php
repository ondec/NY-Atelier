<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Staff endpoints are protected by staff tokens and gates, not by a local IP or demo mode. */
class HostedStaffAccessTest extends TestCase
{
    use RefreshDatabase;

    private const STAFF_URLS = [
        '/api/demo/staff/orders', '/api/demo/staff/customers', '/api/demo/staff/salaries', '/api/demo/staff/team',
        '/api/demo/staff/overview', '/api/demo/staff/finances/overview', '/api/demo/staff/consultations',
        '/api/demo/staff/studio/catalogue', '/api/demo/staff/studio/sales',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        config(['demo.enabled' => false]);
    }

    public function test_guests_are_refused_on_every_staff_endpoint(): void
    {
        foreach (self::STAFF_URLS as $url) {
            $this->getJson($url)->assertUnauthorized();
        }
    }

    public function test_customer_tokens_are_refused_on_every_staff_endpoint(): void
    {
        $customer = Customer::query()->create(['name' => 'Ama Owusu', 'email' => 'ama@example.com']);
        $token = $customer->createToken('test', ['customer'])->plainTextToken;
        foreach (self::STAFF_URLS as $url) {
            $this->app['auth']->forgetGuards();
            $this->withToken($token)->getJson($url)->assertForbidden();
        }
    }

    public function test_staff_users_without_a_staff_token_or_with_an_inactive_account_are_refused(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['staff_role' => 'owner', 'staff_active' => true])->save();
        Sanctum::actingAs($user, ['customer']);
        $this->getJson('/api/demo/staff/orders')->assertForbidden();

        $this->app['auth']->forgetGuards();
        $user->forceFill(['staff_active' => false])->save();
        Sanctum::actingAs($user, ['staff']);
        $this->getJson('/api/demo/staff/orders')->assertForbidden();
    }

    public function test_an_owner_reaches_every_staff_endpoint_from_a_hosted_address_without_demo_mode(): void
    {
        $this->signInStaff();
        foreach (self::STAFF_URLS as $url) {
            $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.7'])->getJson($url)->assertOk();
        }
    }

    public function test_a_receptionist_is_limited_by_role_gates(): void
    {
        $this->signInStaff('receptionist');
        $this->getJson('/api/demo/staff/orders')->assertOk();
        $this->getJson('/api/demo/staff/customers')->assertOk();
        $this->getJson('/api/demo/staff/studio/catalogue')->assertOk();
        $this->getJson('/api/demo/staff/salaries')->assertForbidden();
        $this->getJson('/api/demo/staff/team')->assertForbidden();
        $this->getJson('/api/demo/staff/finances/overview')->assertForbidden();
    }

    public function test_forwarded_headers_from_untrusted_clients_do_not_change_the_request_ip(): void
    {
        $this->signInStaff();
        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.7'])
            ->withHeaders(['X-Forwarded-For' => '127.0.0.1'])
            ->getJson('/api/demo/staff/orders')->assertOk();
        $this->assertSame([], config('trustedproxy.proxies'));
        $this->assertSame('198.51.100.7', request()->ip());
    }

    public function test_public_demo_routes_still_need_demo_mode(): void
    {
        $this->getJson('/api/demo/orders')->assertNotFound();
        $this->getJson('/api/demo/consultations')->assertNotFound();
    }
}
