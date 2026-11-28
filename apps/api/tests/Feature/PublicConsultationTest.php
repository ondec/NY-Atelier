<?php

namespace Tests\Feature;

use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class PublicConsultationTest extends TestCase
{
    use RefreshDatabase;

    private function requestData(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'name' => 'Website Visitor',
            'email' => 'visitor@example.test',
            'phone' => '+233 20 000 0000',
            'method' => 'virtual',
            'purpose' => 'Bespoke tailoring',
            'preferredDate' => now('Africa/Accra')->addDays(15)->toDateString(),
            'preferredTime' => '10:00',
            'notes' => 'A jacket for an event.',
        ];
    }

    public function test_website_request_is_visible_in_office_without_claiming_an_existing_customer_account(): void
    {
        config(['demo.enabled' => false]);
        $this->freezeTime();
        Customer::query()->create(['name' => 'Account Owner', 'email' => 'visitor@example.test']);
        $data = $this->requestData();

        $this->postJson('/api/consultations', $data)->assertCreated()
            ->assertExactJson(['id' => $data['id'], 'status' => 'received']);
        $this->assertDatabaseHas('consultations', [
            'id' => $data['id'], 'source' => 'website', 'customer_id' => null,
            'contact_name' => 'Website Visitor', 'contact_email' => 'visitor@example.test',
            'contact_phone' => '+233 20 000 0000', 'status' => 'awaiting-confirmation',
        ]);
        $this->assertDatabaseCount('customers', 1);
        $this->getJson('/api/demo/staff/consultations')->assertUnauthorized();

        $this->signInStaff();
        $this->getJson('/api/demo/staff/consultations')->assertOk()
            ->assertJsonPath('0.id', $data['id'])
            ->assertJsonPath('0.customer_name', 'Website Visitor')
            ->assertJsonPath('0.customer_email', 'visitor@example.test')
            ->assertJsonPath('0.customer_phone', '+233 20 000 0000')
            ->assertJsonPath('0.source', 'website');
    }

    public function test_retry_is_idempotent_and_cannot_overwrite_an_existing_booking(): void
    {
        $this->freezeTime();
        $data = $this->requestData();
        $this->postJson('/api/consultations', $data)->assertCreated();
        $this->postJson('/api/consultations', $data)->assertOk()
            ->assertExactJson(['id' => $data['id'], 'status' => 'received']);
        $this->postJson('/api/consultations', [...$data, 'name' => 'Changed Visitor'])->assertConflict();
        $this->assertDatabaseCount('consultations', 1);
        $this->assertSame('Website Visitor', DB::table('consultations')->where('id', $data['id'])->value('contact_name'));
    }

    public function test_invalid_or_past_requests_do_not_enter_the_office_queue(): void
    {
        $this->freezeTime();
        $data = $this->requestData();
        $this->postJson('/api/consultations', [...$data, 'email' => 'not-an-email'])->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->postJson('/api/consultations', [...$data, 'preferredDate' => now('Africa/Accra')->subDay()->toDateString()])
            ->assertUnprocessable()->assertJsonValidationErrors('preferredDate');
        $this->assertDatabaseCount('consultations', 0);
    }

    public function test_website_request_cannot_use_the_demo_customer_reply_endpoint(): void
    {
        config(['demo.enabled' => true]);
        $this->freezeTime();
        $data = $this->requestData();
        $this->postJson('/api/consultations', $data)->assertCreated();
        $this->signInStaff();
        $this->patchJson('/api/demo/consultations/'.$data['id'].'/staff', [
            'action' => 'propose', 'version' => 1,
            'options' => [['date' => $data['preferredDate'], 'time' => '12:00'], ['date' => $data['preferredDate'], 'time' => '13:00']],
        ])->assertOk();
        $this->patchJson('/api/demo/consultations/'.$data['id'].'/customer', ['action' => 'accept', 'version' => 2, 'option' => 0])->assertNotFound();
    }
}
