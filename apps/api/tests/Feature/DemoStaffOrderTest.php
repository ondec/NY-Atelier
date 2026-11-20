<?php

namespace Tests\Feature;

use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DemoStaffOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_create_one_custom_order_from_a_confirmed_consultation(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->seed();
        $client = Customer::query()->where('name', config('demo.customer_name'))->firstOrFail();
        $consultation = (string) Str::uuid();
        $date = now('Africa/Accra')->addDay()->toDateString();
        $this->postJson('/api/demo/consultations', [
            'id' => $consultation, 'method' => 'virtual', 'purpose' => 'Custom clothing',
            'preferredDate' => $date, 'preferredTime' => '10:00',
        ])->assertCreated();
        $this->patchJson("/api/demo/consultations/$consultation/staff", ['action' => 'confirm', 'version' => 1])->assertOk();

        $url = '/api/demo/staff/orders';
        $payload = [
            'request_id' => (string) Str::uuid(), 'category' => 'Custom', 'customer_id' => $client->id,
            'service_offering' => 'bespoke', 'consultation_id' => $consultation,
            'items' => [['garment_name' => 'Tailored suit'], ['garment_name' => 'Dinner jacket']],
        ];
        $this->postJson($url, $payload)->assertUnprocessable()->assertJsonValidationErrors('consultation_held');
        $payload['consultation_held'] = true;
        $reference = $this->postJson($url, $payload)->assertCreated()->json('reference');
        $this->postJson($url, $payload)->assertOk()->assertJsonPath('reference', $reference);
        $this->postJson($url, [...$payload, 'request_id' => (string) Str::uuid()])->assertConflict();
        $this->getJson('/api/demo/consultations')->assertJsonPath('0.order_reference', $reference);

        $response = $this->getJson('/api/demo/orders')->assertOk()->assertJsonCount(5, 'orders');
        $order = collect($response->json('orders'))->firstWhere('reference', $reference);
        $this->assertSame('Bespoke Tailor-Made Clothing', $order['service_offering']);
        $this->assertFalse($order['is_complete']);
        $this->assertSame(['Tailored suit', 'Dinner jacket'], array_column($order['items'], 'garment_name'));
    }

    public function test_staff_endpoint_creates_alterations_and_rejects_ready_to_wear_and_nonlocal_writes(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->seed();
        $client = Customer::query()->where('name', config('demo.customer_name'))->firstOrFail();
        $payload = [
            'request_id' => (string) Str::uuid(), 'category' => 'Alterations', 'customer_id' => $client->id,
            'items' => [['garment_name' => 'Trouser hem adjustment']],
        ];
        $url = '/api/demo/staff/orders';
        $this->postJson($url, [...$payload, 'category' => 'Ready-to-Wear'])->assertUnprocessable();
        $this->postJson($url, $payload)->assertCreated();
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.1'])->postJson($url, $payload)->assertNotFound();
    }
}
