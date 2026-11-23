<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DemoCustomersTest extends TestCase
{
    use RefreshDatabase;

    public function test_fittings_are_ordered_by_date_and_orders_keep_their_linked_fitting(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $customers = '/api/demo/staff/customers';
        $id = $this->postJson($customers, ['name' => 'Test fitting client', 'email' => ' FITTING@example.test '])
            ->assertCreated()->json('id');
        $other = $this->postJson($customers, ['name' => 'Test other client', 'phone' => '+233 200 000 000'])
            ->assertCreated()->json('id');

        $old = $this->postJson("$customers/$id/measurements", [
            'request_id' => (string) Str::uuid(), 'measured_on' => '2026-01-05', 'values' => ['waist' => 82, 'height' => 172],
        ])->assertCreated()->json('id');
        $latestInput = [
            'request_id' => (string) Str::uuid(), 'measured_on' => '2026-02-07', 'values' => ['waist' => 85.5],
        ];
        $latest = $this->postJson("$customers/$id/measurements", $latestInput)->assertSuccessful()->json('id');
        $this->postJson("$customers/$id/measurements", $latestInput)->assertSuccessful()->assertJsonPath('id', $latest);
        $this->getJson("$customers/$id")->assertOk()->assertJsonPath('customer.email', 'fitting@example.test')
            ->assertJsonCount(2, 'measurements')->assertJsonPath('measurements.0.id', $latest)
            ->assertJsonPath('measurements.1.values.waist', 82);

        $payload = [
            'request_id' => (string) Str::uuid(), 'category' => 'Custom', 'customer_id' => $other,
            'service_offering' => 'bespoke', 'measurement_id' => $old, 'items' => [['garment_name' => 'Test suit']],
        ];
        $this->postJson('/api/demo/staff/orders', $payload)->assertUnprocessable()->assertJsonValidationErrors('measurement_id');
        $this->postJson('/api/demo/staff/orders', [...$payload, 'customer_id' => $id])->assertCreated();
        $this->getJson("$customers/$id")->assertJsonPath('orders.0.measurement_id', $old);
        $this->getJson('/api/demo/orders')->assertJsonCount(0, 'orders');
        $this->getJson('/api/demo/staff/orders')->assertJsonPath('orders.0.measurement_id', $old);
    }

    public function test_garment_fittings_keep_their_style_and_distinct_measurements_when_retried(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $url = '/api/demo/staff/customers';
        $customer = $this->postJson($url, ['name' => 'Garment fitting client', 'email' => 'garment@example.test'])
            ->assertCreated()->json('id');

        $this->getJson($url)->assertOk()
            ->assertJsonPath('templates.agbada.groups.0.fields.1', 'agbada_span')
            ->assertJsonPath('templates.shirt-short.groups.1.fields.0', 'short_sleeve');

        $legacy = $this->postJson("$url/$customer/measurements", [
            'request_id' => (string) Str::uuid(), 'measured_on' => '2026-01-01', 'values' => ['chest' => 94],
        ])->assertCreated()->json('id');

        $payload = [
            'request_id' => (string) Str::uuid(), 'measured_on' => '2026-01-02',
            'garment_type' => 'agbada', 'values' => ['agbada_length' => 140, 'agbada_span' => 180, 'rise' => 72.5],
        ];
        $fitting = $this->postJson("$url/$customer/measurements", $payload)->assertCreated()->json('id');
        $this->postJson("$url/$customer/measurements", [...$payload, 'garment_type' => 'suit'])
            ->assertSuccessful()->assertJsonPath('id', $fitting);

        $this->getJson("$url/$customer")->assertOk()->assertJsonCount(2, 'measurements')
            ->assertJsonPath('measurements.0.garment_type', 'agbada')
            ->assertJsonPath('measurements.0.values.agbada_span', 180)
            ->assertJsonPath('measurements.0.values.rise', 72.5)
            ->assertJsonPath('measurements.1.id', $legacy)
            ->assertJsonPath('measurements.1.garment_type', null);

        $this->postJson("$url/$customer/measurements", [
            ...$payload, 'request_id' => (string) Str::uuid(), 'garment_type' => 'unsupported',
        ])->assertUnprocessable()->assertJsonValidationErrors('garment_type');
    }

    public function test_customer_routes_work_for_hosted_staff_and_require_at_least_one_contact_method(): void
    {
        $url = '/api/demo/staff/customers';
        $this->signInStaff();
        // Staff access no longer depends on demo mode or a local IP; the staff token and gates protect it.
        config(['demo.enabled' => false]);
        $this->getJson($url)->assertOk();
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->postJson($url, ['name' => 'Walk-in'])->assertUnprocessable();
        $this->postJson($url, ['name' => config('demo.customer_name'), 'email' => 'invalid-claim@example.test'])
            ->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.1'])->getJson($url)->assertOk();
    }
}
