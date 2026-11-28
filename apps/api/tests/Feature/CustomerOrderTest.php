<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_signed_in_customer_sees_only_their_own_orders_without_staff_details(): void
    {
        $ama = Customer::factory()->create();
        $kofi = Customer::factory()->create();
        $order = Order::query()->create(['reference' => 'NY-RTW-AMA001', 'customer_id' => $ama->id, 'category' => 'Ready-to-Wear', 'status' => 'Order created',
            'workflow_stage' => 'order_created', 'workflow_version' => 1, 'fulfilment_method' => 'Delivery', 'delivery_address' => 'Haatso']);
        $order->events()->create(['title' => 'Order created', 'occurred_at' => now(), 'client_visible' => true]);
        $order->events()->create(['title' => 'Staff note', 'occurred_at' => now(), 'client_visible' => false]);
        Order::query()->create(['reference' => 'NY-RTW-KOFI01', 'customer_id' => $kofi->id, 'category' => 'Ready-to-Wear', 'status' => 'Order created']);

        Sanctum::actingAs($ama, ['customer']);
        $this->getJson('/api/customer/orders')->assertOk()
            ->assertJsonCount(1, 'orders')
            ->assertJsonPath('orders.0.reference', 'NY-RTW-AMA001')
            ->assertJsonCount(1, 'orders.0.timeline')
            ->assertJsonMissingPath('orders.0.delivery')
            ->assertJsonMissingPath('orders.0.can_dispatch');
    }

    public function test_orders_need_a_customer_session(): void
    {
        $this->getJson('/api/customer/orders')->assertUnauthorized();

        Sanctum::actingAs(Customer::factory()->create(), ['something-else']);
        $this->getJson('/api/customer/orders')->assertUnauthorized();
    }
}
