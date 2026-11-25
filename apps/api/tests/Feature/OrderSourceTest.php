<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class OrderSourceTest extends TestCase
{
    use RefreshDatabase;

    public static function creationPaths(): array
    {
        return [
            'Office' => ['/api/demo/staff/orders', 'office'],
            'Studio' => ['/api/demo/staff/studio/orders', 'studio'],
        ];
    }

    #[DataProvider('creationPaths')]
    public function test_source_is_saved_from_the_creation_path_and_cannot_be_spoofed_or_changed_on_retry(string $url, string $source): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $customer = Customer::query()->create(['name' => 'Source test customer']);
        $payload = ['request_id' => (string) Str::uuid(), 'category' => 'Alterations', 'customer_id' => $customer->id,
            'source' => 'customer_app', 'items' => [['garment_name' => 'Trouser hem adjustment']]];

        $reference = $this->postJson($url, $payload)->assertCreated()->json('reference');

        $this->assertDatabaseHas('orders', ['reference' => $reference, 'source' => $source]);
        $this->getJson('/api/demo/staff/orders/'.$reference)->assertOk()->assertJsonPath('order.source', $source);
        $this->postJson($url, [...$payload, 'source' => 'studio'])->assertOk()->assertJsonPath('reference', $reference);
        $this->assertDatabaseHas('orders', ['reference' => $reference, 'source' => $source]);
        $this->assertDatabaseCount('orders', 1);
    }

    public function test_studio_custom_orders_require_order_management(): void
    {
        config(['demo.enabled' => true]);
        $url = '/api/demo/staff/studio/orders';
        $this->postJson($url, [])->assertUnauthorized();
        $customer = Customer::query()->create(['name' => 'Source test customer']);
        $payload = ['category' => 'Custom', 'service_offering' => 'bespoke', 'customer_id' => $customer->id, 'items' => [['garment_name' => 'Suit']]];

        $this->signInStaff('receptionist');
        $this->postJson($url, ['request_id' => (string) Str::uuid(), ...$payload])->assertForbidden();
        $this->assertDatabaseCount('orders', 0);

        $this->signInStaff('manager');
        $reference = $this->postJson($url, ['request_id' => (string) Str::uuid(), ...$payload])->assertCreated()->json('reference');

        $this->assertStringStartsWith('NY-CUS-', $reference);
        $this->assertDatabaseHas('orders', ['reference' => $reference, 'category' => 'Custom', 'source' => 'studio', 'customer_id' => $customer->id]);
    }

    public function test_delivery_details_are_saved_with_a_delivery_order(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff('manager');
        $customer = Customer::query()->create(['name' => 'Delivery customer']);
        $payload = ['category' => 'Custom', 'service_offering' => 'bespoke', 'customer_id' => $customer->id, 'items' => [['garment_name' => 'Suit']]];
        $delivery = ['recipient_name' => 'Ama Mensah', 'phone' => '+233 24 000 0000', 'address' => '12 Oxford Street', 'area' => 'Osu, Accra',
            'gps_code' => 'ga1234567', 'directions' => 'Blue gate opposite the pharmacy', 'latitude' => 5.556, 'longitude' => -0.1823];

        $reference = $this->postJson('/api/demo/staff/studio/orders', ['request_id' => (string) Str::uuid(), ...$payload, 'fulfilment_method' => 'Delivery', 'delivery' => $delivery])
            ->assertCreated()->json('reference');

        $this->getJson('/api/demo/staff/orders/'.$reference)->assertOk()
            ->assertJsonPath('order.delivery.address', '12 Oxford Street')
            ->assertJsonPath('order.delivery.gps_code', 'GA-123-4567')
            ->assertJsonPath('order.delivery.latitude', 5.556)
            ->assertJsonPath('order.delivery.longitude', -0.1823);

        $this->postJson('/api/demo/staff/studio/orders', ['request_id' => (string) Str::uuid(), ...$payload, 'fulfilment_method' => 'Collection', 'delivery' => $delivery])
            ->assertUnprocessable()->assertJsonValidationErrors('delivery');
        $this->postJson('/api/demo/staff/studio/orders', ['request_id' => (string) Str::uuid(), ...$payload, 'fulfilment_method' => 'Delivery', 'delivery' => [...$delivery, 'address' => '']])
            ->assertUnprocessable()->assertJsonValidationErrors('delivery.address');
        $this->postJson('/api/demo/staff/studio/orders', ['request_id' => (string) Str::uuid(), ...$payload, 'fulfilment_method' => 'Delivery', 'delivery' => [...$delivery, 'longitude' => null]])
            ->assertUnprocessable()->assertJsonValidationErrors('delivery.longitude');
        $this->assertDatabaseCount('orders', 1);
    }

    public function test_staff_order_list_can_be_limited_to_one_customer(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff('receptionist');
        $first = Customer::query()->create(['name' => 'First customer']);
        $second = Customer::query()->create(['name' => 'Second customer']);
        Order::query()->create(['customer_id' => $first->id, 'reference' => 'NY-CUS-FIRST', 'category' => 'Custom', 'status' => 'Order received']);
        Order::query()->create(['customer_id' => $second->id, 'reference' => 'NY-CUS-SECOND', 'category' => 'Custom', 'status' => 'Order received']);

        $this->getJson('/api/demo/staff/orders?customer='.$first->id)->assertOk()
            ->assertJsonCount(1, 'orders')->assertJsonPath('orders.0.reference', 'NY-CUS-FIRST');
        $this->getJson('/api/demo/staff/orders')->assertOk()->assertJsonCount(2, 'orders');
    }

    public function test_read_only_staff_can_see_each_saved_source_in_the_shared_list_and_details(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff('receptionist');
        $customer = Customer::query()->create(['name' => 'Source test customer']);
        foreach (['customer_app', 'studio', 'office', null] as $index => $source) {
            Order::query()->create(['customer_id' => $customer->id, 'reference' => 'SOURCE-'.$index, 'category' => 'Ready-to-Wear', 'status' => 'Order received', 'source' => $source]);
        }

        $response = $this->getJson('/api/demo/staff/orders')->assertOk()->assertJsonCount(4, 'orders');

        foreach (['customer_app', 'studio', 'office', null] as $index => $source) {
            $response->assertJsonPath('orders.'.$index.'.source', $source);
        }
        $this->getJson('/api/demo/staff/orders/SOURCE-0')->assertOk()->assertJsonPath('order.source', 'customer_app');
    }

    public function test_migration_identifies_only_orders_linked_to_saved_studio_sales(): void
    {
        $customer = Customer::query()->create(['name' => 'Source test customer']);
        $known = Order::query()->create(['customer_id' => $customer->id, 'reference' => 'NY-RTW-KNOWN', 'category' => 'Ready-to-Wear', 'status' => 'Order received']);
        $unknown = Order::query()->create(['customer_id' => $customer->id, 'reference' => 'NY-RTW-UNKNOWN', 'category' => 'Ready-to-Wear', 'status' => 'Order received']);
        DB::table('studio_sales')->insert(['id' => (string) Str::uuid(), 'order_id' => $known->id, 'request_hash' => str_repeat('0', 64), 'payment_method' => 'cash', 'total_minor' => 100, 'receipt' => '{}', 'created_at' => now(), 'updated_at' => now()]);
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('source');
        });

        $migration = require database_path('migrations/2026_11_20_194826_add_source_to_orders_table.php');
        $migration->up();

        $this->assertDatabaseHas('orders', ['id' => $known->id, 'source' => 'studio']);
        $this->assertDatabaseHas('orders', ['id' => $unknown->id, 'source' => null]);
    }
}
