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

    public function test_studio_creation_requires_sign_in_and_rejects_custom_orders_with_403(): void
    {
        config(['demo.enabled' => true]);
        $url = '/api/demo/staff/studio/orders';
        $this->postJson($url, [])->assertUnauthorized();
        $this->signInStaff();
        $customer = Customer::query()->create(['name' => 'Source test customer']);

        $this->postJson($url, ['request_id' => (string) Str::uuid(), 'category' => 'Custom', 'service_offering' => 'bespoke', 'customer_id' => $customer->id,
            'items' => [['garment_name' => 'Suit']]])->assertForbidden();

        $this->assertDatabaseCount('orders', 0);
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
