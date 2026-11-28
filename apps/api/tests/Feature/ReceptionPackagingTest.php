<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ReceptionPackagingTest extends TestCase
{
    use RefreshDatabase;

    public function test_production_can_hand_a_finished_order_to_reception_to_package(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $customer = Customer::query()->create(['name' => 'Ama Mensah', 'email' => 'ama@example.test']);
        $order = Order::query()->create([
            'reference' => 'NY-CUS-TEST01', 'customer_id' => $customer->id, 'category' => 'Custom', 'status' => 'Production done',
            'workflow_stage' => 'production_done', 'workflow_version' => 1, 'sent_to_production_at' => now(), 'fulfilment_method' => 'Delivery',
        ]);
        $order->items()->create(['garment_name' => 'Kaftan', 'status' => 'Final checks complete', 'completed_at' => now()]);

        $this->postJson('/api/demo/staff/production/NY-CUS-TEST01/to-reception')->assertOk();
        $this->assertNotNull($order->fresh()->handed_to_front_desk_at);
        $this->postJson('/api/demo/staff/production/NY-CUS-TEST01/to-reception')->assertConflict();
        $this->getJson('/api/demo/staff/front-desk/alerts')->assertOk()->assertJsonPath('alerts.0.kind', 'to_package');
    }

    public function test_only_operations_and_rtw_store_reception_can_send_orders_for_delivery(): void
    {
        config(['demo.enabled' => true]);
        $courier = User::factory()->create();
        $courier->forceFill(['staff_role' => 'courier', 'staff_active' => true])->save();
        $customer = Customer::query()->create(['name' => 'Ama Mensah', 'email' => 'ama@example.test']);
        foreach (['NY-RTW-TEST01' => 'Ready-to-Wear', 'NY-CUS-TEST02' => 'Custom'] as $reference => $category) {
            Order::query()->create([
                'reference' => $reference, 'customer_id' => $customer->id, 'category' => $category, 'status' => 'Packaged',
                'workflow_stage' => 'packaged', 'workflow_version' => 1, 'fulfilment_method' => 'Delivery',
            ]);
        }

        $reception = $this->signInStaff('receptionist');
        $reception->forceFill(['staff_location' => 'rtw_store'])->save();
        $this->patchJson('/api/demo/staff/orders/NY-RTW-TEST01/courier', ['courier_id' => $courier->id])->assertOk();
        $this->patchJson('/api/demo/staff/orders/NY-CUS-TEST02/courier', ['courier_id' => $courier->id])->assertForbidden();

        $this->signInStaff('operations');
        $this->patchJson('/api/demo/staff/orders/NY-CUS-TEST02/courier', ['courier_id' => $courier->id])->assertOk();
    }

    public function test_a_courier_can_pick_up_a_packaged_delivery_order_no_one_has_taken(): void
    {
        config(['demo.enabled' => true]);
        $customer = Customer::query()->create(['name' => 'Ama Mensah', 'email' => 'ama@example.test']);
        Order::query()->create([
            'reference' => 'NY-RTW-TEST03', 'customer_id' => $customer->id, 'category' => 'Ready-to-Wear', 'status' => 'Packaged',
            'workflow_stage' => 'packaged', 'workflow_version' => 1, 'fulfilment_method' => 'Delivery',
        ]);

        $courier = $this->signInStaff('courier');
        $this->getJson('/api/demo/staff/deliveries')->assertOk()->assertJsonPath('deliveries.0.claimable', true);
        $this->postJson('/api/demo/staff/deliveries/NY-RTW-TEST03/claim')->assertOk();
        $this->assertSame($courier->id, Order::query()->where('reference', 'NY-RTW-TEST03')->value('assigned_courier_id'));

        $this->signInStaff('courier');
        $this->postJson('/api/demo/staff/deliveries/NY-RTW-TEST03/claim')->assertConflict();
        $this->getJson('/api/demo/staff/deliveries')->assertOk()->assertJsonCount(0, 'deliveries');
    }

    public function test_reception_records_only_hand_over_steps_for_its_own_store(): void
    {
        config(['demo.enabled' => true]);
        $customer = Customer::query()->create(['name' => 'Ama Mensah', 'email' => 'ama@example.test']);
        foreach (['NY-RTW-TEST04' => 'Ready-to-Wear', 'NY-ALT-TEST05' => 'Alterations'] as $reference => $category) {
            $order = Order::query()->create(['reference' => $reference, 'customer_id' => $customer->id, 'category' => $category,
                'status' => 'Order created', 'workflow_stage' => 'received', 'workflow_version' => 1, 'fulfilment_method' => 'Delivery']);
            $order->items()->create(['garment_name' => 'Shirt', 'status' => 'Order created']);
        }
        $reception = $this->signInStaff('receptionist');
        $reception->forceFill(['staff_location' => 'rtw_store'])->save();
        $advance = fn (string $reference, string $stage) => $this->patchJson("/api/demo/staff/orders/{$reference}/workflow",
            ['request_id' => (string) Str::uuid(), 'version' => Order::query()->where('reference', $reference)->value('workflow_version'), 'action' => 'advance', 'stage' => $stage]);

        $advance('NY-RTW-TEST04', 'packaged')->assertOk()->assertJsonPath('order.status', 'Packaged');
        $advance('NY-ALT-TEST05', 'assessment')->assertForbidden();
    }
}
