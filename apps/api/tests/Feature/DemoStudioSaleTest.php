<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DemoStudioSaleTest extends TestCase
{
    use RefreshDatabase;

    private function catalogue(int $quantity = 4): array
    {
        return ['inventory' => ['products' => [['id' => 'clover', 'name' => 'Red Clover Set', 'type' => 'Two-piece sets', 'price' => 19.99, 'photo' => '/navy.jpg', 'gallery' => ['/navy.jpg']]],
            'variants' => [['id' => 'olive-m', 'productId' => 'clover', 'colour' => 'Olive', 'fabric' => 'Cotton', 'size' => 'M', 'sku' => 'RC-OL-M', 'quantity' => $quantity, 'reorderAt' => 2]],
            'visuals' => ['["clover","olive","cotton"]' => ['gallery' => ['/olive.jpg']]], 'movements' => []], 'collections' => []];
    }

    private function prepare(int $quantity = 4): array
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $customer = Customer::query()->create(['name' => config('demo.customer_name')]);
        $this->postJson('/api/demo/staff/studio/catalogue/initialize', $this->catalogue($quantity))->assertOk()->assertJsonPath('inventory.products.0.photo', '/navy.jpg');

        return ['request_id' => (string) Str::uuid(), 'customer_id' => $customer->id, 'lines' => [['variantId' => 'olive-m', 'quantity' => 1]],
            'revision' => 1, 'total_minor' => 1999, 'payment_method' => 'cash', 'tendered_minor' => 2000, 'payment_confirmed' => true, 'handover' => 'collection', 'handover_confirmed' => false];
    }

    public function test_cash_sale_records_correct_variant_receipt_order_stock_and_change_once(): void
    {
        $data = $this->prepare();
        $data['lines'][0]['quantity'] = 3;
        $data['total_minor'] = 5997;
        $data['tendered_minor'] = 6000;
        $quote = $this->postJson('/api/demo/staff/studio/sales/quote', ['customer_id' => $data['customer_id'], 'lines' => $data['lines']])->assertOk();
        $quote->assertJsonPath('total_minor', 5997)->assertJsonPath('lines.0.photo', '/olive.jpg');
        $response = $this->postJson('/api/demo/staff/studio/sales', $data)->assertCreated()->assertJsonPath('receipt.change_minor', 3)->assertJsonPath('receipt.lines.0.sku', 'RC-OL-M');
        $reference = $response->json('receipt.reference');
        $this->postJson('/api/demo/staff/studio/sales', $data)->assertOk()->assertJsonPath('replayed', true)->assertJsonPath('receipt.reference', $reference);
        $this->assertDatabaseCount('studio_sales', 1);
        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseHas('orders', ['reference' => $reference, 'customer_id' => $data['customer_id'], 'category' => 'Ready-to-Wear', 'source' => 'studio', 'payment_status' => 'Paid', 'completed_at' => null]);
        $this->getJson('/api/demo/staff/studio/catalogue')->assertOk()->assertJsonPath('inventory.variants.0.quantity', 1)->assertJsonCount(1, 'inventory.movements')->assertJsonPath('revision', 2);
        $this->getJson('/api/demo/orders')->assertOk()->assertJsonPath('orders.0.reference', $reference)->assertJsonPath('orders.0.payment_status', 'Paid')->assertJsonPath('orders.0.source', 'studio');
        $this->getJson('/api/demo/staff/studio/sales/'.$data['request_id'])->assertOk()->assertJsonPath('receipt.total_minor', 5997);
        $data['tendered_minor'] = 7000;
        $this->postJson('/api/demo/staff/studio/sales', $data)->assertConflict();
    }

    public function test_competing_checkouts_and_stale_office_edits_cannot_oversell_or_restore_sold_stock(): void
    {
        $data = $this->prepare(1);
        $this->postJson('/api/demo/staff/studio/sales', $data)->assertCreated();
        $this->postJson('/api/demo/staff/studio/sales', [...$data, 'request_id' => (string) Str::uuid()])->assertUnprocessable();
        $this->postJson('/api/demo/staff/studio/catalogue', [...$this->catalogue(1), 'revision' => 1])->assertConflict();
        $this->postJson('/api/demo/staff/studio/catalogue/initialize', $this->catalogue(99))->assertOk()->assertJsonPath('inventory.variants.0.quantity', 0);
        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('studio_sales', 1);
    }

    public function test_server_prices_and_newer_catalogue_revisions_require_a_fresh_review(): void
    {
        $data = $this->prepare();
        $this->postJson('/api/demo/staff/studio/sales', [...$data, 'total_minor' => 100])->assertConflict();
        $updated = $this->catalogue();
        $updated['inventory']['products'][0]['price'] = 25;
        $this->postJson('/api/demo/staff/studio/catalogue', [...$updated, 'revision' => 1])->assertOk();
        $this->postJson('/api/demo/staff/studio/sales', $data)->assertConflict();
        $this->assertDatabaseCount('studio_sales', 0);
        $this->getJson('/api/demo/staff/studio/catalogue')->assertJsonPath('inventory.variants.0.quantity', 4);
    }

    public function test_mobile_money_requires_verified_reference_and_rejects_duplicate_payment(): void
    {
        $data = [...$this->prepare(), 'payment_method' => 'mobile-money', 'payment_reference' => 'mtn-12345'];
        unset($data['tendered_minor']);
        $this->postJson('/api/demo/staff/studio/sales', $data)->assertCreated()->assertJsonPath('receipt.payment_reference', 'MTN-12345')->assertJsonPath('receipt.change_minor', 0);
        $this->postJson('/api/demo/staff/studio/sales', [...$data, 'revision' => 2, 'request_id' => (string) Str::uuid(), 'payment_reference' => 'MTN-12345'])->assertConflict();
        $this->assertDatabaseCount('studio_sales', 1);
        $this->getJson('/api/demo/staff/studio/sales?search=mtn-12345')->assertOk()->assertJsonPath('total', 1);
    }

    public function test_takeaway_marks_collection_only_after_explicit_handover_confirmation(): void
    {
        $data = [...$this->prepare(), 'handover' => 'take-away'];
        $this->postJson('/api/demo/staff/studio/sales', $data)->assertUnprocessable()->assertJsonValidationErrors('handover_confirmed');
        $response = $this->postJson('/api/demo/staff/studio/sales', [...$data, 'handover_confirmed' => true])->assertCreated();
        $order = Order::query()->where('reference', $response->json('receipt.reference'))->firstOrFail();
        $this->assertNotNull($order->completed_at);
        $this->assertSame('collected', $order->workflow_stage);
        $this->assertDatabaseHas('order_events', ['order_id' => $order->id, 'title' => 'Collected']);
    }

    public function test_a_piece_that_needs_altering_turns_the_paid_sale_into_an_alteration_for_production(): void
    {
        $data = $this->prepare();
        $data['lines'][0]['alteration'] = 'Shorten sleeves 2cm';
        $this->postJson('/api/demo/staff/studio/sales', [...$data, 'handover' => 'take-away', 'handover_confirmed' => true])
            ->assertUnprocessable()->assertJsonValidationErrors('handover');

        $response = $this->postJson('/api/demo/staff/studio/sales', $data)->assertCreated()
            ->assertJsonPath('receipt.alteration', 'Red Clover Set · Olive · Cotton · Size M: Shorten sleeves 2cm');
        $order = Order::query()->where('reference', $response->json('receipt.reference'))->firstOrFail();
        $this->assertSame('Alterations', $order->category);
        $this->assertSame('Ready-to-Wear', $order->original_category);
        $this->assertSame('Paid', $order->payment_status);
        $this->assertNull($order->completed_at);
        $this->assertSame('received', $order->workflow_stage);
        $this->assertStringContainsString('Shorten sleeves 2cm', (string) $order->specifications);
        $this->assertDatabaseHas('order_events', ['order_id' => $order->id, 'title' => 'Needs alteration', 'client_visible' => false]);
        // The sale and its stock deduction are still recorded.
        $this->assertDatabaseHas('studio_sales', ['id' => $data['request_id'], 'order_id' => $order->id]);
        // The front desk can send it straight to production: the alteration is already described.
        $this->postJson("/api/demo/staff/orders/{$order->reference}/send-to-production")->assertOk();
        $this->assertSame('in_production', $order->refresh()->workflow_stage);
    }

    public function test_a_blank_alteration_note_keeps_an_ordinary_sale(): void
    {
        $data = $this->prepare();
        $data['lines'][0]['alteration'] = '  ';
        $data['handover'] = 'take-away';
        $data['handover_confirmed'] = true;
        $response = $this->postJson('/api/demo/staff/studio/sales', $data)->assertCreated()->assertJsonPath('receipt.alteration', null);
        $this->assertSame('Ready-to-Wear', Order::query()->where('reference', $response->json('receipt.reference'))->value('category'));
    }

    public function test_delivery_stays_active_and_saved_receipt_does_not_change_with_catalogue_edits(): void
    {
        $data = [...$this->prepare(), 'handover' => 'delivery', 'instructions' => 'Deliver to the reception desk.'];
        $this->postJson('/api/demo/staff/studio/sales', $data)->assertCreated();
        $updated = $this->catalogue(3);
        $updated['inventory']['products'][0]['price'] = 50;
        $this->postJson('/api/demo/staff/studio/catalogue', [...$updated, 'revision' => 2])->assertOk();
        $this->getJson('/api/demo/staff/studio/sales/'.$data['request_id'])->assertOk()->assertJsonPath('receipt.total_minor', 1999);
        $this->assertDatabaseHas('orders', ['fulfilment_method' => 'Delivery', 'completed_at' => null, 'handover_instructions' => 'Deliver to the reception desk.']);
    }

    public function test_fabric_only_variants_keep_their_gallery_and_can_be_purchased(): void
    {
        $data = $this->prepare();
        $catalogue = $this->catalogue();
        $catalogue['inventory']['variants'][0]['colour'] = '';
        $catalogue['inventory']['variants'][0]['fabric'] = 'Pinstripe cotton';
        $catalogue['inventory']['visuals'] = ['["clover","","pinstripe cotton"]' => ['gallery' => ['/pinstripe.jpg']]];
        $this->postJson('/api/demo/staff/studio/catalogue', [...$catalogue, 'revision' => 1])->assertOk()->assertJsonPath('inventory.variants.0.colour', '');
        $this->postJson('/api/demo/staff/studio/sales', [...$data, 'revision' => 2])->assertCreated()->assertJsonPath('receipt.lines.0.photo', '/pinstripe.jpg')->assertJsonPath('receipt.lines.0.fabric', 'Pinstripe cotton');
    }

    public function test_office_shop_details_are_saved_and_reach_the_public_catalogue(): void
    {
        $this->prepare();
        $catalogue = $this->catalogue();
        $catalogue['inventory']['products'][0] += ['description' => 'Linen two-piece.', 'section' => 'women', 'isNew' => true, 'offerPrice' => 15, 'sizing' => ['shirt', 'trousers']];
        $catalogue['inventory']['visuals']['["clover","olive","cotton"]'] += ['swatch' => '#556b2f', 'group' => 'brown'];
        $this->postJson('/api/demo/staff/studio/catalogue', [...$catalogue, 'revision' => 1])->assertOk()
            ->assertJsonPath('inventory.products.0.section', 'women')
            ->assertJsonPath('inventory.visuals.["clover","olive","cotton"].group', 'brown');

        $this->getJson('/api/shop/catalogue')->assertOk()
            ->assertJsonPath('products.0.description', 'Linen two-piece.')
            ->assertJsonPath('products.0.section', 'women')
            ->assertJsonPath('products.0.isNew', true)
            ->assertJsonPath('products.0.offerPriceMinor', 1500)
            ->assertJsonPath('products.0.sizing', ['shirt', 'trousers'])
            ->assertJsonPath('products.0.colours.0.swatch', '#556b2f')
            ->assertJsonPath('products.0.colours.0.group', 'brown');
    }

    public function test_unknown_shop_sections_groups_and_swatches_are_refused(): void
    {
        $this->prepare();
        foreach ([
            ['products', 'section', 'kids'],
            ['products', 'sizing', ['hat']],
            ['visuals', 'group', 'purple'],
            ['visuals', 'swatch', 'red'],
        ] as [$list, $key, $value]) {
            $catalogue = $this->catalogue();
            if ($list === 'products') {
                $catalogue['inventory']['products'][0][$key] = $value;
            } else {
                $catalogue['inventory']['visuals']['["clover","olive","cotton"]'][$key] = $value;
            }
            $this->postJson('/api/demo/staff/studio/catalogue', [...$catalogue, 'revision' => 1])->assertUnprocessable();
        }
    }

    public static function invalidPayments(): array
    {
        return [
            'insufficient cash' => [['tendered_minor' => 1900], 'tendered_minor'],
            'unconfirmed payment' => [['payment_confirmed' => false], 'payment_confirmed'],
            'missing transfer reference' => [['payment_method' => 'mobile-money'], 'payment_reference'],
            'missing delivery address' => [['handover' => 'delivery'], 'instructions'],
            'unknown method' => [['payment_method' => 'crypto'], 'payment_method'],
            'non-positive quantity' => [['lines' => [['variantId' => 'olive-m', 'quantity' => 0]]], 'lines.0.quantity'],
            'repeated variant' => [['lines' => [['variantId' => 'olive-m', 'quantity' => 1], ['variantId' => 'olive-m', 'quantity' => 1]]], 'lines.0.variantId'],
        ];
    }

    #[DataProvider('invalidPayments')]
    public function test_invalid_payment_returns_422_without_creating_orders_or_changing_stock(array $changes, string $field): void
    {
        $data = $this->prepare();
        $this->postJson('/api/demo/staff/studio/sales', [...$data, ...$changes])->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertDatabaseCount('studio_sales', 0);
        $this->assertDatabaseCount('orders', 0);
        $this->getJson('/api/demo/staff/studio/catalogue')->assertJsonPath('inventory.variants.0.quantity', 4);
    }

    public function test_uncounted_imported_stock_cannot_be_sold_even_if_a_quantity_is_present(): void
    {
        $data = $this->prepare();
        $catalogue = $this->catalogue();
        $catalogue['inventory']['variants'][0]['stockVerified'] = false;
        $catalogue['inventory']['products'][0] += ['wordpressId' => 25, 'sourceUrl' => 'https://rtw.thenyatelier.com/product/test/', 'description' => 'A real source description.'];
        $this->postJson('/api/demo/staff/studio/catalogue', [...$catalogue, 'revision' => 1])->assertOk()
            ->assertJsonPath('inventory.variants.0.stockVerified', false)->assertJsonPath('inventory.products.0.wordpressId', 25);
        $this->postJson('/api/demo/staff/studio/sales/quote', $data)->assertUnprocessable()->assertJsonValidationErrors('lines');
        $this->assertDatabaseCount('studio_sales', 0);
        $catalogue['inventory']['variants'][0]['stockVerified'] = true;
        $this->postJson('/api/demo/staff/studio/catalogue', [...$catalogue, 'revision' => 2])->assertOk();
        $this->postJson('/api/demo/staff/studio/sales/quote', $data)->assertOk();
    }

    public function test_catalogue_rejects_invalid_prices_and_sale_routes_work_for_hosted_staff(): void
    {
        $data = $this->prepare();
        $invalid = $this->catalogue();
        $invalid['inventory']['products'][0]['price'] = -10;
        $this->postJson('/api/demo/staff/studio/catalogue', [...$invalid, 'revision' => 1])->assertUnprocessable();
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.1'])->postJson('/api/demo/staff/studio/sales', $data)->assertCreated();
        $this->getJson('/api/demo/staff/studio/sales')->assertOk();
        config(['demo.enabled' => false]);
        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])->getJson('/api/demo/staff/studio/catalogue')->assertOk();
        $this->assertSame(1, DB::table('studio_sales')->count());
    }
}
