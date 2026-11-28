<?php

namespace Tests\Feature;

use App\Mail\OrderUpdateMail;
use App\Models\Customer;
use App\Models\DeliveryStartPoint;
use App\Models\Order;
use App\Models\User;
use App\OrderCustomerNotice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DeliveryTest extends TestCase
{
    use RefreshDatabase;

    private function courier(string $email = 'courier@example.test'): User
    {
        $user = User::factory()->create(['email' => $email, 'name' => 'Kofi Courier']);
        $user->forceFill(['staff_role' => 'courier', 'staff_active' => true])->save();

        return $user;
    }

    private function order(string $stage = 'out_for_delivery', string $method = 'Delivery'): Order
    {
        $customer = Customer::query()->create(['name' => 'Ama Owusu', 'phone' => '+233200000001']);
        $order = Order::query()->create(['reference' => 'NY-RTW-'.Str::upper(Str::random(10)), 'customer_id' => $customer->id, 'category' => 'Ready-to-Wear',
            'source' => 'studio', 'status' => 'Out for delivery', 'workflow_stage' => $stage, 'workflow_version' => 1, 'payment_status' => 'Paid',
            'fulfilment_method' => $method, 'fulfilment_status' => 'To be arranged', 'delivery_address' => '12 Ring Road, Osu', 'delivery_phone' => '+233200000002']);
        $order->items()->create(['garment_name' => 'Ember Pocket · Size M', 'status' => 'Packaged', 'sort_order' => 0, 'completed_at' => now()]);

        return $order;
    }

    public function test_the_order_desk_assigns_a_courier_who_sees_only_their_deliveries_and_confirms_them(): void
    {
        $courier = $this->courier();
        $other = $this->courier('other@example.test');
        $mine = $this->order();
        $theirs = $this->order();

        $this->signInStaff('operations');
        $this->getJson('/api/demo/staff/couriers')->assertOk()->assertJsonCount(2, 'couriers');
        $this->patchJson("/api/demo/staff/orders/{$mine->reference}/courier", ['courier_id' => $courier->id])->assertOk()
            ->assertJsonPath('order.assigned_courier.name', 'Kofi Courier');
        $this->patchJson("/api/demo/staff/orders/{$theirs->reference}/courier", ['courier_id' => $other->id])->assertOk();

        $this->getJson('/api/demo/staff/deliveries')->assertOk()->assertJsonPath('board', true)->assertJsonCount(2, 'deliveries')
            ->assertJsonPath('deliveries.0.can_deliver', false);

        Sanctum::actingAs($courier, ['staff']);
        $this->getJson('/api/staff/auth/me')->assertOk()->assertJsonPath('staff.officeHref', '/deliveries');
        $this->getJson('/api/demo/staff/deliveries')->assertOk()->assertJsonPath('board', false)->assertJsonCount(1, 'deliveries')
            ->assertJsonPath('deliveries.0.reference', $mine->reference)->assertJsonPath('deliveries.0.address', '12 Ring Road, Osu')
            ->assertJsonPath('deliveries.0.can_deliver', true)->assertJsonMissingPath('deliveries.0.payment_status');
        $this->postJson("/api/demo/staff/deliveries/{$theirs->reference}/delivered", ['request_id' => (string) Str::uuid(), 'note' => 'Handed over'])->assertNotFound();
        $this->postJson("/api/demo/staff/deliveries/{$mine->reference}/delivered", ['request_id' => (string) Str::uuid(), 'note' => ''])->assertUnprocessable();
        $this->postJson("/api/demo/staff/deliveries/{$mine->reference}/delivered", ['request_id' => (string) Str::uuid(), 'note' => 'Handed to Ama at the gate'])
            ->assertOk()->assertJsonPath('delivery.stage', 'delivered');
        $this->assertNotNull($mine->refresh()->completed_at);
        $this->assertDatabaseHas('order_events', ['order_id' => $mine->id, 'stage_key' => 'delivered']);

        // Couriers have no NY Office, NY Studio or NY Production access.
        foreach (['/api/demo/staff/orders', '/api/demo/staff/customers', '/api/demo/staff/production', '/api/demo/staff/studio/catalogue'] as $url) {
            $this->getJson($url)->assertForbidden();
        }
    }

    public function test_couriers_are_only_for_delivery_orders_and_a_not_yet_sent_order_cannot_be_delivered(): void
    {
        $courier = $this->courier();
        $collection = $this->order('ready_collection', 'Collection');
        $packed = $this->order('packaged');
        $this->signInStaff('receptionist');
        $this->patchJson("/api/demo/staff/orders/{$packed->reference}/courier", ['courier_id' => $courier->id])->assertForbidden();

        $this->signInStaff('manager');
        $this->patchJson("/api/demo/staff/orders/{$collection->reference}/courier", ['courier_id' => $courier->id])->assertUnprocessable();
        $this->patchJson("/api/demo/staff/orders/{$packed->reference}/courier", ['courier_id' => 999])->assertUnprocessable();
        $this->patchJson("/api/demo/staff/orders/{$packed->reference}/courier", ['courier_id' => $courier->id])->assertOk();

        Sanctum::actingAs($courier, ['staff']);
        $this->getJson('/api/demo/staff/deliveries')->assertOk()->assertJsonPath('deliveries.0.can_deliver', false);
        $this->postJson("/api/demo/staff/deliveries/{$packed->reference}/delivered", ['request_id' => (string) Str::uuid(), 'note' => 'Handed over'])->assertUnprocessable();
    }

    public function test_the_desk_sets_areas_and_shops_and_an_area_fixes_the_promised_delivery_dates(): void
    {
        $order = $this->order('packaged');
        $order->forceFill(['created_at' => now()->setDate(2026, 11, 20)])->save();
        $this->signInStaff('operations');
        $zone = $this->postJson('/api/demo/staff/delivery-settings/zones', ['name' => 'Inside Accra', 'min_days' => 2, 'max_days' => 3])->assertCreated()
            ->assertJsonPath('zone.label', '2–3 days')->json('zone.id');
        $this->postJson('/api/demo/staff/delivery-settings/zones', ['name' => 'Inside Accra', 'min_days' => 1, 'max_days' => 1])->assertUnprocessable();
        $this->postJson('/api/demo/staff/delivery-settings/zones', ['name' => 'Kumasi', 'min_days' => 5, 'max_days' => 3])->assertUnprocessable();
        $this->postJson('/api/demo/staff/delivery-settings/start-points', ['name' => 'Osu shop', 'latitude' => 5.556, 'longitude' => -0.182])->assertCreated();
        $this->getJson('/api/demo/staff/delivery-settings')->assertOk()->assertJsonCount(1, 'zones')->assertJsonCount(1, 'start_points');

        $this->patchJson("/api/demo/staff/orders/{$order->reference}/delivery-zone", ['zone_id' => $zone])->assertOk()
            ->assertJsonPath('delivery_promise.from', '2026-11-22')->assertJsonPath('delivery_promise.by', '2026-11-23');
        $this->getJson("/api/demo/staff/orders/{$order->reference}")->assertOk()->assertJsonPath('order.delivery_promise.area', 'Inside Accra');

        $this->signInStaff('receptionist');
        $this->getJson('/api/demo/staff/delivery-settings')->assertForbidden();
        $this->postJson('/api/demo/staff/delivery-settings/zones', ['name' => 'Tema', 'min_days' => 1, 'max_days' => 2])->assertForbidden();
    }

    public function test_a_courier_plans_a_road_route_through_chosen_stops_then_starts_it(): void
    {
        $courier = $this->courier();
        $near = $this->order('packaged');
        $far = $this->order('packaged');
        $unpinned = $this->order('packaged');
        $near->forceFill(['assigned_courier_id' => $courier->id, 'delivery_latitude' => 5.56, 'delivery_longitude' => -0.18])->save();
        $far->forceFill(['assigned_courier_id' => $courier->id, 'delivery_latitude' => 5.65, 'delivery_longitude' => -0.10])->save();
        $unpinned->forceFill(['assigned_courier_id' => $courier->id])->save();
        $someoneElses = $this->order('packaged');
        Http::fake(['router.project-osrm.org/*' => Http::sequence()->push(['code' => 'Ok',
            'waypoints' => [['waypoint_index' => 0], ['waypoint_index' => 2], ['waypoint_index' => 1]],
            'trips' => [['distance' => 15400.4, 'duration' => 1800.2, 'legs' => [['distance' => 9000, 'duration' => 1000], ['distance' => 6400, 'duration' => 800]],
                'geometry' => ['coordinates' => [[-0.19, 5.55], [-0.10, 5.65], [-0.18, 5.56]]]]],
        ])->push('down', 503)]);

        Sanctum::actingAs($courier, ['staff']);
        $this->getJson('/api/demo/staff/deliveries')->assertOk()->assertJsonPath('deliveries.0.ready', true);
        $this->postJson('/api/demo/staff/deliveries/route', ['start' => ['latitude' => 5.55, 'longitude' => -0.19], 'references' => [$near->reference, $far->reference, $unpinned->reference]])
            ->assertOk()->assertJsonPath('route.order', [$far->reference, $near->reference])->assertJsonPath('route.unmapped', [$unpinned->reference])
            ->assertJsonPath('route.distance_m', 15400)->assertJsonPath('route.path.0', [5.55, -0.19])->assertJsonPath('route.estimated', false);
        $this->postJson('/api/demo/staff/deliveries/route', ['start' => ['latitude' => 5.55, 'longitude' => -0.19], 'references' => [$someoneElses->reference]])->assertNotFound();

        $this->postJson('/api/demo/staff/deliveries/route', ['start' => ['latitude' => 5.55, 'longitude' => -0.19], 'references' => [$near->reference, $far->reference]])
            ->assertOk()->assertJsonPath('route.order', [$near->reference, $far->reference])->assertJsonPath('route.estimated', true);

        $this->postJson('/api/demo/staff/deliveries/start', ['references' => [$near->reference, $far->reference]])->assertOk()
            ->assertJsonPath('started', [$near->reference, $far->reference]);
        $this->assertSame('out_for_delivery', $near->refresh()->workflow_stage);
        $this->postJson('/api/demo/staff/deliveries/start', ['references' => [$near->reference]])->assertOk()->assertJsonPath('started', []);
    }

    public function test_a_courier_can_add_a_pick_up_at_a_shop_and_finish_back_at_a_shop(): void
    {
        Http::fake(['router.project-osrm.org/*' => Http::response('down', 503)]);
        $courier = $this->courier();
        $onBoard = $this->order('out_for_delivery');
        $waiting = $this->order('packaged');
        $onBoard->forceFill(['assigned_courier_id' => $courier->id, 'delivery_latitude' => 5.60, 'delivery_longitude' => -0.18])->save();
        $waiting->forceFill(['assigned_courier_id' => $courier->id, 'delivery_latitude' => 5.57, 'delivery_longitude' => -0.17])->save();
        $shop = DeliveryStartPoint::query()->create(['name' => 'Osu studio', 'latitude' => 5.556, 'longitude' => -0.182]);

        Sanctum::actingAs($courier, ['staff']);
        // From near the on-board stop: deliver it first, then collect, then the new order, and finish at the shop.
        $this->postJson('/api/demo/staff/deliveries/route', ['start' => ['latitude' => 5.61, 'longitude' => -0.18], 'references' => [$onBoard->reference, $waiting->reference],
            'pickup_point_id' => $shop->id, 'pickup_references' => [$waiting->reference], 'finish_point_id' => $shop->id])->assertOk()
            ->assertJsonPath('route.order', [$onBoard->reference, 'pickup', $waiting->reference])->assertJsonPath('route.pickup.name', 'Osu studio')
            ->assertJsonPath('route.finish.name', 'Osu studio');
        // From right by the shop: collect first.
        $this->postJson('/api/demo/staff/deliveries/route', ['start' => ['latitude' => 5.556, 'longitude' => -0.183], 'references' => [$onBoard->reference, $waiting->reference],
            'pickup_point_id' => $shop->id, 'pickup_references' => [$waiting->reference]])->assertOk()
            ->assertJsonPath('route.order.0', 'pickup');
        $this->postJson('/api/demo/staff/deliveries/route', ['start' => ['latitude' => 5.61, 'longitude' => -0.18], 'references' => [$onBoard->reference],
            'pickup_point_id' => $shop->id, 'pickup_references' => [$waiting->reference]])->assertUnprocessable();
    }

    public function test_the_customer_hears_it_is_coming_today_and_a_courier_can_move_a_delivery_to_another_day(): void
    {
        $courier = $this->courier();
        $order = $this->order('packaged');
        $order->forceFill(['assigned_courier_id' => $courier->id])->save();
        Sanctum::actingAs($courier, ['staff']);
        $this->postJson('/api/demo/staff/deliveries/start', ['references' => [$order->reference]])->assertOk();
        $this->assertDatabaseHas('order_events', ['order_id' => $order->id, 'stage_key' => 'out_for_delivery', 'client_visible' => true,
            'explanation' => 'Your delivery is coming today. Kofi will bring it to the agreed address.']);

        $this->postJson("/api/demo/staff/deliveries/{$order->reference}/postpone", ['reason' => 'x'])->assertUnprocessable();
        $this->postJson("/api/demo/staff/deliveries/{$order->reference}/postpone", ['reason' => 'Customer travelling', 'new_date' => now()->subDay()->toDateString()])->assertUnprocessable();
        $date = now()->addDays(2);
        $this->postJson("/api/demo/staff/deliveries/{$order->reference}/postpone", ['reason' => 'Customer travelling', 'new_date' => $date->toDateString()])->assertOk();
        $order->refresh();
        $this->assertSame('packaged', $order->workflow_stage);
        $this->assertSame($date->toDateString(), $order->delivery_due_by->toDateString());
        $this->assertDatabaseHas('order_events', ['order_id' => $order->id, 'title' => 'Delivery moved', 'client_visible' => true,
            'explanation' => 'Your delivery has been moved to '.$date->format('l j F').'. We’ll let you know when it’s on the way.']);
        $this->getJson('/api/demo/staff/deliveries')->assertJsonPath('deliveries.0.ready', true);
        $this->postJson("/api/demo/staff/deliveries/{$order->reference}/postpone", ['reason' => 'Again'])->assertUnprocessable();

        // The customer's timeline: Out for delivery is no longer ticked and shows the new day; the email carries every stage.
        $timeline = collect(app(OrderCustomerNotice::class)->timeline($order->fresh()))->keyBy('label');
        $this->assertSame('done', $timeline['Order created']['state']);
        $this->assertSame('current', $timeline['Packaged']['state']);
        $this->assertSame('upcoming', $timeline['Out for delivery']['state']);
        $this->assertSame('Moved to '.$date->format('D j M'), $timeline['Out for delivery']['note']);
        $notice = app(OrderCustomerNotice::class);
        $this->assertSame('Expected delivery: '.$date->format('D j M'), $notice->expectedDelivery($order->fresh()));
        $html = (new OrderUpdateMail($order->reference, 'Delivery moved', null, $timeline->values()->all(), $notice->expectedDelivery($order->fresh())))->render();
        $this->assertStringContainsString('Your order so far', $html);
        $this->assertStringContainsString('Moved to '.$date->format('D j M'), $html);
        $this->assertStringContainsString('Expected delivery: '.$date->format('D j M'), $html);
    }

    public function test_the_expected_delivery_window_follows_the_order_and_stops_once_delivered(): void
    {
        $notice = app(OrderCustomerNotice::class);
        $order = $this->order('packaged');
        $order->forceFill(['fulfilment_method' => 'Delivery', 'delivery_due_from' => '2026-12-02', 'delivery_due_by' => '2026-12-03'])->save();
        $this->assertSame('Expected delivery: Wed 2 – Thu 3 Dec', $notice->expectedDelivery($order->fresh()));
        $order->forceFill(['delivery_due_by' => '2027-01-04'])->save();
        $this->assertSame('Expected delivery: Wed 2 Dec – Mon 4 Jan', $notice->expectedDelivery($order->fresh()));
        $order->forceFill(['completed_at' => now()])->save();
        $this->assertNull($notice->expectedDelivery($order->fresh()));
        $order->forceFill(['completed_at' => null, 'fulfilment_method' => 'Collection'])->save();
        $this->assertNull($notice->expectedDelivery($order->fresh()));
    }
}
