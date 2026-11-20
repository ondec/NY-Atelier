<?php

namespace Tests\Feature;

use App\Models\Customer;
use Database\Seeders\DemoConsultationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class DemoConsultationTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_decline_then_accept_a_new_offer(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->freezeTime();
        $url = '/api/demo/consultations';
        $id = (string) Str::uuid();
        $date = now('Africa/Accra')->addDay()->toDateString();
        $input = [
            'id' => $id, 'method' => 'virtual', 'purpose' => 'Couture Experience',
            'preferredDate' => $date, 'preferredTime' => '10:00',
        ];
        $this->postJson($url, $input)->assertCreated()->assertJsonPath('status', 'awaiting-confirmation');
        $this->postJson($url, $input)->assertOk();
        $this->getJson($url)->assertJsonCount(1);
        $this->patchJson("$url/$id/staff", [
            'action' => 'propose', 'version' => 1,
            'options' => [['date' => $date, 'time' => '12:00'], ['date' => $date, 'time' => '14:00']],
        ])->assertOk()->assertJsonPath('status', 'awaiting-customer')->assertJsonCount(2, 'options');
        $this->patchJson("$url/$id/customer", ['action' => 'decline', 'version' => 2])
            ->assertOk()->assertJsonPath('status', 'needs-alternatives')->assertJsonCount(0, 'options');
        $this->patchJson("$url/$id/customer", ['action' => 'accept', 'version' => 2, 'option' => 0])
            ->assertConflict();
        $this->patchJson("$url/$id/staff", [
            'action' => 'propose', 'version' => 3,
            'options' => [['date' => $date, 'time' => '16:00']],
        ])->assertOk();
        $this->patchJson("$url/$id/customer", ['action' => 'accept', 'version' => 4, 'option' => 0])
            ->assertOk()->assertJsonPath('status', 'confirmed')->assertJsonPath('confirmedTime', '16:00');
        $this->getJson($url)->assertJsonPath('0.confirmedDate', $date);
    }

    public function test_staff_can_confirm_the_requested_time_and_demo_routes_are_disabled_by_default(): void
    {
        config(['demo.enabled' => false]);
        $url = '/api/demo/consultations';
        $this->getJson($url)->assertNotFound();

        config(['demo.enabled' => true]);
        $this->signInStaff();
        $id = (string) Str::uuid();
        $date = now('Africa/Accra')->addDay()->toDateString();
        $this->postJson($url, [
            'id' => $id, 'method' => 'in-person', 'purpose' => 'Custom clothing',
            'preferredDate' => $date, 'preferredTime' => '10:00',
        ])->assertCreated();
        $this->patchJson("$url/$id/staff", ['action' => 'confirm', 'version' => 1])
            ->assertOk()->assertJsonPath('status', 'confirmed')->assertJsonPath('confirmedTime', '10:00');
        $this->patchJson("$url/$id/staff", ['action' => 'confirm', 'version' => 1])->assertConflict();
    }

    public function test_requests_are_linked_to_the_demo_customer_and_return_current_customer_details(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $customer = Customer::query()->create(['name' => config('demo.customer_name'), 'email' => 'ama@example.test']);
        $id = (string) Str::uuid();
        $this->postJson('/api/demo/consultations', [
            'id' => $id, 'method' => 'virtual', 'purpose' => 'Couture Experience',
            'preferredDate' => now('Africa/Accra')->addDay()->toDateString(), 'preferredTime' => '10:00',
        ])->assertCreated()->assertJsonPath('customer_id', $customer->id)->assertJsonPath('customer_email', 'ama@example.test');
        $this->assertDatabaseHas('consultations', ['id' => $id, 'customer_id' => $customer->id]);
        $customer->update(['name' => 'Ama Mensah updated']);
        $this->getJson('/api/demo/consultations')->assertOk()->assertJsonPath('0.customer_name', 'Ama Mensah updated');
    }

    public function test_sample_consultations_cover_the_workflow_without_overwriting_reviewed_requests(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->freezeTime();
        $this->seed(DemoConsultationSeeder::class);
        $customer = Customer::query()->where('name', config('demo.customer_name'))->firstOrFail();
        $this->getJson('/api/demo/consultations')->assertOk()->assertJsonCount(6)
            ->assertJsonPath('0.customer_id', $customer->id);
        $id = 'c0115a00-0000-4000-8000-000000000001';
        $this->patchJson("/api/demo/consultations/$id/staff", ['action' => 'confirm', 'version' => 1])->assertOk();
        $this->seed(DemoConsultationSeeder::class);
        $this->assertDatabaseCount('consultations', 6);
        $this->assertDatabaseHas('consultations', ['id' => $id, 'status' => 'confirmed', 'version' => 2]);
        $this->assertSame(6, DB::table('consultations')->where('customer_id', $customer->id)->count());
    }

    public function test_sample_consultations_are_not_inserted_when_demo_is_disabled(): void
    {
        config(['demo.enabled' => false]);
        $this->seed(DemoConsultationSeeder::class);
        $this->assertDatabaseCount('consultations', 0);
        $this->assertDatabaseCount('customers', 0);
    }
}
