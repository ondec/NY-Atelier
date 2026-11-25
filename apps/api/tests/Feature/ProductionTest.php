<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\User;
use App\StaffAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductionTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        config(['demo.enabled' => true]);
        Storage::fake('fittings');
        $this->customer = Customer::query()->create(['name' => 'Production customer', 'phone' => '+233 24 000 0001']);
    }

    private function order(string $reference, string $category = 'Custom', array $extra = []): Order
    {
        return Order::query()->create(['customer_id' => $this->customer->id, 'reference' => $reference, 'category' => $category,
            'status' => 'Order received', 'workflow_stage' => 'received', 'payment_status' => 'Deposit paid', 'sent_to_production_at' => now(), ...$extra]);
    }

    private function tailor(string $name = 'Kwame Tailor'): User
    {
        $tailor = User::factory()->create(['name' => $name]);
        $tailor->forceFill(['staff_role' => 'tailor', 'staff_active' => true])->save();

        return $tailor;
    }

    public function test_production_manager_sees_custom_and_alteration_orders_without_payments(): void
    {
        $this->order('NY-CUS-ONE', 'Custom', ['specifications' => 'Navy wool, peak lapel']);
        $this->order('NY-ALT-ONE', 'Alterations');
        $this->order('NY-RTW-ONE', 'Ready-to-Wear');
        $this->signInStaff('production');

        $this->getJson('/api/demo/staff/production')->assertOk()->assertJsonCount(2, 'orders')->assertJsonPath('can_manage', true)
            ->assertJsonMissingPath('orders.0.payment_status');
        $this->getJson('/api/demo/staff/production/NY-CUS-ONE')->assertOk()
            ->assertJsonPath('order.specifications', 'Navy wool, peak lapel')
            ->assertJsonPath('customer.phone', '+233 24 000 0001')
            ->assertJsonPath('order.workflow.can_manage', true)
            ->assertJsonMissingPath('order.payment_status');
        $this->getJson('/api/demo/staff/production/NY-RTW-ONE')->assertNotFound();
        // Production managers don't reach the general order desk, sales or customer records.
        $this->getJson('/api/demo/staff/orders')->assertForbidden();
        $this->getJson('/api/demo/staff/customers')->assertForbidden();
        $this->getJson('/api/demo/staff/consultations')->assertForbidden();
        $this->assertSame('/production', StaffAccess::homeHref('production'));
        $this->assertSame('/production', StaffAccess::homeHref('tailor'));
    }

    public function test_assigning_and_reassigning_a_tailor_is_recorded_and_limits_what_tailors_see(): void
    {
        $first = $this->tailor('Kwame Tailor');
        $second = $this->tailor('Efua Tailor');
        $this->order('NY-CUS-ASSIGN');
        $this->order('NY-CUS-OTHER');
        $this->signInStaff('production');

        $this->patchJson('/api/demo/staff/production/NY-CUS-ASSIGN/tailor', ['tailor_id' => $first->id])->assertOk()
            ->assertJsonPath('order.assigned_tailor.name', 'Kwame Tailor');
        $this->patchJson('/api/demo/staff/production/NY-CUS-ASSIGN/tailor', ['tailor_id' => $second->id])->assertOk()
            ->assertJsonPath('order.assigned_tailor.name', 'Efua Tailor');
        $receptionist = User::factory()->create();
        $receptionist->forceFill(['staff_role' => 'receptionist', 'staff_active' => true])->save();
        $this->patchJson('/api/demo/staff/production/NY-CUS-ASSIGN/tailor', ['tailor_id' => $receptionist->id])->assertUnprocessable();

        $order = Order::query()->where('reference', 'NY-CUS-ASSIGN')->firstOrFail();
        $this->assertSame(['Assigned to Kwame Tailor', 'Reassigned to Efua Tailor'], $order->events()->where('action_type', 'assignment')->reorder('id')->pluck('title')->all());
        $this->assertFalse((bool) $order->events()->where('action_type', 'assignment')->value('client_visible'));

        Sanctum::actingAs($second, ['staff']);
        $this->getJson('/api/demo/staff/production')->assertOk()->assertJsonCount(1, 'orders')
            ->assertJsonPath('orders.0.reference', 'NY-CUS-ASSIGN')->assertJsonPath('can_manage', false)->assertJsonPath('tailors', []);
        $this->getJson('/api/demo/staff/production/NY-CUS-ASSIGN')->assertOk()->assertJsonPath('order.workflow.can_manage', false);
        $this->getJson('/api/demo/staff/production/NY-CUS-OTHER')->assertNotFound();
        $this->patchJson('/api/demo/staff/production/NY-CUS-ASSIGN/tailor', ['tailor_id' => null])->assertForbidden();

        Sanctum::actingAs($first, ['staff']);
        $this->getJson('/api/demo/staff/production')->assertOk()->assertJsonCount(0, 'orders');
    }

    public function test_production_manager_moves_an_order_to_the_next_stage(): void
    {
        $order = $this->order('NY-CUS-STAGE');
        $this->signInStaff('production');

        // Front-desk steps move on their own; production records Production done.
        $this->patchJson('/api/demo/staff/production/NY-CUS-STAGE/workflow', ['request_id' => (string) Str::uuid(), 'version' => $order->fresh()->workflow_version,
            'action' => 'advance', 'stage' => 'measurements'])->assertForbidden();
        $order->update(['workflow_stage' => 'in_production']);
        $this->getJson('/api/demo/staff/production/NY-CUS-STAGE')->assertOk()->assertJsonPath('order.workflow.can_advance', true);
        $this->patchJson('/api/demo/staff/production/NY-CUS-STAGE/workflow', ['request_id' => (string) Str::uuid(), 'version' => $order->fresh()->workflow_version,
            'action' => 'advance', 'stage' => 'production_done', 'note' => 'Inspected'])->assertOk()->assertJsonPath('order.workflow.current', 'production_done');
        $this->patchJson('/api/demo/staff/production/NY-CUS-STAGE/workflow', ['request_id' => (string) Str::uuid(), 'version' => $order->fresh()->workflow_version,
            'action' => 'cancel', 'note' => 'x'])->assertForbidden();

        Sanctum::actingAs($this->tailor(), ['staff']);
        $this->patchJson('/api/demo/staff/production/NY-CUS-STAGE/workflow', ['request_id' => (string) Str::uuid(), 'version' => 2, 'action' => 'note', 'note' => 'x'])->assertForbidden();
    }

    public function test_inspiration_is_uploaded_to_orders_and_only_visible_to_people_working_on_them(): void
    {
        $this->order('NY-CUS-PHOTO');
        $this->signInStaff('manager');

        $this->post('/api/demo/staff/orders/NY-CUS-PHOTO/attachments', ['attachments' => [UploadedFile::fake()->image('look.jpg')]], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonCount(1, 'attachments');
        $id = DB::table('order_attachments')->value('id');
        $this->get("/api/demo/staff/orders/NY-CUS-PHOTO/attachments/$id")->assertOk();
        $this->getJson('/api/demo/staff/orders/NY-CUS-PHOTO')->assertOk()->assertJsonPath('order.attachments.0.name', 'look.jpg');

        $tailor = $this->tailor();
        Sanctum::actingAs($tailor, ['staff']);
        $this->get("/api/demo/staff/orders/NY-CUS-PHOTO/attachments/$id")->assertNotFound();
        Order::query()->where('reference', 'NY-CUS-PHOTO')->update(['assigned_tailor_id' => $tailor->id]);
        $this->get("/api/demo/staff/orders/NY-CUS-PHOTO/attachments/$id")->assertOk();
        $this->post('/api/demo/staff/orders/NY-CUS-PHOTO/attachments', ['attachments' => [UploadedFile::fake()->image('more.jpg')]], ['Accept' => 'application/json'])->assertForbidden();

        $this->signInStaff('production');
        $this->deleteJson("/api/demo/staff/orders/NY-CUS-PHOTO/attachments/$id")->assertOk();
        $this->assertDatabaseCount('order_attachments', 0);
    }

    public function test_creating_an_order_from_a_fitting_moves_its_inspiration_and_saves_specifications(): void
    {
        $fittingId = DB::table('customer_measurements')->insertGetId(['request_id' => (string) Str::uuid(), 'customer_id' => $this->customer->id,
            'measured_on' => now()->toDateString(), 'values' => json_encode(['chest' => 100]), 'additional_measurements' => '[]', 'recorded_unit' => 'cm', 'created_at' => now(), 'updated_at' => now()]);
        $photo = (string) Str::uuid();
        DB::table('fitting_attachments')->insert(['id' => $photo, 'measurement_id' => $fittingId, 'path' => "{$this->customer->id}/$fittingId/$photo.jpg",
            'name' => 'old-look.jpg', 'mime_type' => 'image/jpeg', 'size' => 10, 'created_at' => now(), 'updated_at' => now()]);
        $this->signInStaff('manager');

        $reference = $this->postJson('/api/demo/staff/studio/orders', ['request_id' => (string) Str::uuid(), 'category' => 'Custom', 'service_offering' => 'bespoke',
            'customer_id' => $this->customer->id, 'measurement_id' => $fittingId, 'specifications' => 'Single-breasted, two buttons',
            'items' => [['garment_name' => 'Suit']]])->assertCreated()->json('reference');

        $this->assertDatabaseCount('fitting_attachments', 0);
        // Creating it with a fitting confirms the measurements; sending approves the design and starts production.
        $this->getJson("/api/demo/staff/orders/$reference")->assertOk()->assertJsonPath('order.workflow.current', 'measurements');
        $this->postJson("/api/demo/staff/orders/$reference/send-to-production")->assertOk()->assertJsonPath('order.workflow.current', 'in_production');
        $this->assertSame(['Order created', 'Measurements confirmed', 'Design & quotation approved', 'In production'],
            Order::query()->where('reference', $reference)->firstOrFail()->events()->whereNotNull('stage_key')->reorder('id')->pluck('title')->all());
        $this->signInStaff('production');
        $this->getJson("/api/demo/staff/production/$reference")->assertOk()
            ->assertJsonPath('order.specifications', 'Single-breasted, two buttons')
            ->assertJsonPath('order.attachments.0.id', $photo)
            ->assertJsonPath('fitting.values.chest', 100);
    }

    private function advance(string $reference, string $stage): void
    {
        $order = Order::query()->where('reference', $reference)->firstOrFail();
        $this->patchJson("/api/demo/staff/orders/$reference/workflow", ['request_id' => (string) Str::uuid(), 'version' => $order->workflow_version,
            'action' => 'advance', 'stage' => $stage])->assertOk();
    }

    public function test_an_order_reaches_production_only_once_it_is_complete_and_sent(): void
    {
        $fittingId = DB::table('customer_measurements')->insertGetId(['request_id' => (string) Str::uuid(), 'customer_id' => $this->customer->id,
            'measured_on' => now()->toDateString(), 'values' => json_encode(['chest' => 100]), 'additional_measurements' => '[]', 'recorded_unit' => 'cm', 'created_at' => now(), 'updated_at' => now()]);
        $manager = $this->signInStaff('manager');
        $reference = $this->postJson('/api/demo/staff/orders', ['request_id' => (string) Str::uuid(), 'category' => 'Custom', 'service_offering' => 'bespoke',
            'customer_id' => $this->customer->id, 'items' => [['garment_name' => 'Kaftan']]])->assertCreated()->json('reference');
        $this->assertSame($manager->id, Order::query()->where('reference', $reference)->value('created_by_id'));

        $this->getJson("/api/demo/staff/orders/$reference")->assertOk()->assertJsonPath('order.production.sent_at', null)
            ->assertJsonPath('order.production.can_send', false)->assertJsonCount(2, 'order.production.missing');
        $this->postJson("/api/demo/staff/orders/$reference/send-to-production")->assertUnprocessable()->assertJsonCount(2, 'errors.production');

        $production = User::factory()->create();
        $production->forceFill(['staff_role' => 'production', 'staff_active' => true])->save();
        Sanctum::actingAs($production, ['staff']);
        $this->getJson('/api/demo/staff/production')->assertOk()->assertJsonCount(0, 'orders');
        $this->getJson("/api/demo/staff/production/$reference")->assertNotFound();
        $this->postJson("/api/demo/staff/orders/$reference/send-to-production")->assertForbidden();

        // Reception fills in the brief (linking the fitting confirms the measurements) and sends it.
        $reception = User::factory()->create();
        $reception->forceFill(['staff_role' => 'receptionist', 'staff_active' => true])->save();
        Sanctum::actingAs($reception, ['staff']);
        $this->patchJson("/api/demo/staff/orders/$reference/brief", ['specifications' => '  Ivory linen, embroidered placket ', 'measurement_id' => $fittingId])->assertOk()
            ->assertJsonPath('order.specifications', 'Ivory linen, embroidered placket')->assertJsonPath('order.measurement_id', $fittingId)
            ->assertJsonPath('order.production.missing', [])->assertJsonPath('order.workflow.current', 'measurements');
        $this->postJson("/api/demo/staff/orders/$reference/send-to-production")->assertOk()
            ->assertJsonPath('order.production.sent_by', $reception->name)->assertJsonPath('order.production.can_send', false);
        $this->patchJson("/api/demo/staff/orders/$reference/brief", ['specifications' => 'Changed'])->assertForbidden();

        Sanctum::actingAs($production, ['staff']);
        $this->getJson('/api/demo/staff/production')->assertOk()->assertJsonCount(1, 'orders');
        $this->postJson("/api/demo/staff/production/$reference/return", ['reason' => ''])->assertUnprocessable();
        $this->postJson("/api/demo/staff/production/$reference/return", ['reason' => 'Sleeve length missing from the fitting'])->assertOk();
        $this->getJson('/api/demo/staff/production')->assertOk()->assertJsonCount(0, 'orders');

        Sanctum::actingAs($reception, ['staff']);
        $this->getJson("/api/demo/staff/orders/$reference")->assertOk()->assertJsonPath('order.production.sent_at', null)->assertJsonPath('order.workflow.current', 'measurements')
            ->assertJsonPath('order.production.return_reason', 'Sleeve length missing from the fitting')->assertJsonPath('order.production.can_send', true);
        $this->postJson("/api/demo/staff/orders/$reference/send-to-production")->assertOk()->assertJsonPath('order.production.return_reason', null);
        $titles = Order::query()->where('reference', $reference)->firstOrFail()->events()->where('action_type', 'production')->reorder('id')->pluck('title')->all();
        $this->assertSame(['Sent to production', 'Returned from production', 'Sent back to production'], $titles);
    }

    public function test_only_the_sales_desk_or_the_creator_can_send_and_alterations_need_a_description(): void
    {
        $this->order('NY-ALT-SEND', 'Alterations', ['sent_to_production_at' => null, 'specifications' => 'Take in waist 2cm']);
        $this->signInStaff('records');
        $this->postJson('/api/demo/staff/orders/NY-ALT-SEND/send-to-production')->assertForbidden();

        $reception = $this->signInStaff('receptionist');
        Order::query()->where('reference', 'NY-ALT-SEND')->update(['specifications' => null]);
        $this->getJson('/api/demo/staff/orders/NY-ALT-SEND')->assertOk()->assertJsonPath('order.production.missing', ['Describe the alterations for production.']);
        Order::query()->where('reference', 'NY-ALT-SEND')->update(['specifications' => 'Take in waist 2cm']);
        $this->postJson('/api/demo/staff/orders/NY-ALT-SEND/send-to-production')->assertOk()->assertJsonPath('order.production.sent_by', $reception->name)
            ->assertJsonPath('order.workflow.current', 'in_production');
        $this->postJson('/api/demo/staff/orders/NY-ALT-SEND/send-to-production')->assertForbidden();
    }

    public function test_orders_finished_in_production_are_not_in_progress(): void
    {
        $this->order('NY-CUS-SEWING', 'Custom', ['workflow_stage' => 'in_production']);
        $this->order('NY-CUS-PACKED', 'Custom', ['workflow_stage' => 'packaged']);
        $this->order('NY-CUS-DONE', 'Custom', ['workflow_stage' => 'production_done']);
        $this->order('NY-CUS-READY', 'Custom', ['workflow_stage' => 'ready_collection']);
        $this->signInStaff('production');

        $orders = collect($this->getJson('/api/demo/staff/production')->assertOk()->json('orders'))->pluck('is_complete', 'reference');
        // Production done still needs packing by production; packed or handed over is done.
        $this->assertEquals(['NY-CUS-DONE' => false, 'NY-CUS-PACKED' => true, 'NY-CUS-READY' => true, 'NY-CUS-SEWING' => false], $orders->sortKeys()->all());
        $this->postJson('/api/demo/staff/production/NY-CUS-PACKED/return', ['reason' => 'Wrong colour'])->assertUnprocessable();

        $this->signInStaff('owner');
        $this->getJson('/api/demo/staff/orders/NY-CUS-DONE')->assertOk()->assertJsonPath('order.production.finished', true);
        $this->getJson('/api/demo/staff/orders/NY-CUS-SEWING')->assertOk()->assertJsonPath('order.production.finished', false);
    }

    public function test_production_notifications_count_orders_that_arrived_since_last_seen(): void
    {
        $tailor = $this->tailor();
        $this->order('NY-CUS-OLD', 'Custom', ['sent_to_production_at' => now()->subDay(), 'assigned_tailor_id' => $tailor->id, 'assigned_at' => now()->subDay()]);
        $manager = $this->signInStaff('production');
        $this->getJson('/api/demo/staff/production')->assertOk()->assertJsonPath('seen_at', null)->assertJsonPath('orders.0.arrived_at', now()->subDay()->toIso8601String());

        $this->postJson('/api/demo/staff/production/seen')->assertOk();
        $this->assertNotNull($manager->fresh()->production_seen_at);
        $this->getJson('/api/demo/staff/production')->assertOk()->assertJsonPath('seen_at', $manager->fresh()->production_seen_at->toIso8601String());

        Sanctum::actingAs($tailor, ['staff']);
        $this->getJson('/api/demo/staff/production')->assertOk()->assertJsonPath('seen_at', null)->assertJsonPath('orders.0.arrived_at', now()->subDay()->toIso8601String());
    }
}
