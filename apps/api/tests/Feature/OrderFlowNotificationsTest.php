<?php

namespace Tests\Feature;

use App\Mail\OrderUpdateMail;
use App\Mail\StaffOrderAlertMail;
use App\Models\Customer;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** The agreed order handoffs (docs/ORDER_FLOWS.md): who is emailed and notified as an order moves. */
class OrderFlowNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        config(['demo.enabled' => true, 'mail.default' => 'smtp', 'order_workflows.email_enabled' => true, 'order_workflows.front_desk_email' => 'orders@example.test']);
        Mail::fake();
        $this->customer = Customer::query()->create(['name' => 'Flow customer', 'email' => 'customer@example.test']);
    }

    private function staff(string $role, string $email): User
    {
        $user = User::factory()->create(['email' => $email]);
        $user->forceFill(['staff_role' => $role, 'staff_active' => true])->save();

        return $user;
    }

    private function advance(string $reference, string $stage): void
    {
        $order = Order::query()->where('reference', $reference)->firstOrFail();
        $this->patchJson("/api/demo/staff/production/$reference/workflow", ['request_id' => (string) Str::uuid(), 'version' => $order->workflow_version,
            'action' => 'advance', 'stage' => $stage])->assertOk();
    }

    public function test_a_custom_order_emails_the_customer_and_production_manager_and_comes_back_to_the_front_desk(): void
    {
        $manager = $this->staff('production', 'production@example.test');
        $this->staff('production', 'inactive@example.test')->forceFill(['staff_active' => false])->save();
        $fitting = DB::table('customer_measurements')->insertGetId(['request_id' => (string) Str::uuid(), 'customer_id' => $this->customer->id,
            'measured_on' => now()->toDateString(), 'values' => json_encode(['chest' => 100]), 'additional_measurements' => '[]', 'recorded_unit' => 'cm', 'created_at' => now(), 'updated_at' => now()]);
        $reception = $this->signInStaff('receptionist');
        $this->signInStaff('manager');
        $reference = $this->postJson('/api/demo/staff/studio/orders', ['request_id' => (string) Str::uuid(), 'category' => 'Custom', 'service_offering' => 'bespoke',
            'customer_id' => $this->customer->id, 'measurement_id' => $fitting, 'specifications' => 'Navy suit', 'items' => [['garment_name' => 'Suit']]])->assertCreated()->json('reference');
        Mail::assertSent(OrderUpdateMail::class, fn (OrderUpdateMail $mail): bool => $mail->hasTo('customer@example.test') && str_contains($mail->update, 'Order created'));

        Sanctum::actingAs($reception, ['staff']);
        $this->postJson("/api/demo/staff/orders/$reference/send-to-production")->assertOk();
        Mail::assertSent(StaffOrderAlertMail::class, fn (StaffOrderAlertMail $mail): bool => $mail->hasTo('production@example.test') && ! $mail->hasTo('inactive@example.test')
            && str_contains($mail->url, "/production?order=$reference") && $mail->details['Order'] === $reference);
        // The production manager's email carries the full brief: customer, garments, specifications and measurements.
        Mail::assertSent(StaffOrderAlertMail::class, function (StaffOrderAlertMail $mail): bool {
            $sections = collect($mail->sections)->keyBy('title');
            $html = $mail->render();

            return $sections['Customer']['rows']['Email'] === 'customer@example.test' && $sections['Garments']['rows']['1.'] === 'Suit'
                && $sections['Specifications']['text'] === 'Navy suit' && $sections['Measurements']['rows']['Chest / bust'] === '100 cm'
                && str_contains($html, 'Navy suit') && str_contains($html, 'Chest / bust') && ! str_contains($html, 'GHS');
        });
        Mail::assertSent(OrderUpdateMail::class, fn (OrderUpdateMail $mail): bool => str_contains($mail->update, 'In production'));
        Mail::assertNotSent(OrderUpdateMail::class, fn (OrderUpdateMail $mail): bool => str_contains($mail->update, 'Design'));

        // Production finishes, packs it and hands it back; the shared order mailbox and NY Studio are told.
        Sanctum::actingAs($manager, ['staff']);
        $this->advance($reference, 'production_done');
        $order = Order::query()->where('reference', $reference)->firstOrFail();
        $this->patchJson("/api/demo/staff/production/$reference/workflow", ['request_id' => (string) Str::uuid(), 'version' => $order->workflow_version,
            'action' => 'item_ready', 'item_id' => $order->items()->first()->id, 'ready' => true])->assertOk();
        Mail::assertNotSent(StaffOrderAlertMail::class, fn (StaffOrderAlertMail $mail): bool => $mail->hasTo('orders@example.test'));
        $this->advance($reference, 'packaged');
        Mail::assertSent(StaffOrderAlertMail::class, fn (StaffOrderAlertMail $mail): bool => $mail->hasTo('orders@example.test') && $mail->kicker === 'Back from production');
        $this->getJson('/api/demo/staff/production')->assertOk()->assertJsonPath('orders.0.is_complete', true);

        Sanctum::actingAs($reception, ['staff']);
        $this->getJson('/api/demo/staff/front-desk/alerts')->assertOk()->assertJsonPath('alerts.0.reference', $reference)
            ->assertJsonPath('alerts.0.kind', 'packed')->assertJsonPath('seen_at', null);
        $this->postJson('/api/demo/staff/front-desk/seen')->assertOk();
        $this->assertNotNull($this->getJson('/api/demo/staff/front-desk/alerts')->json('seen_at'));
        $this->getJson("/api/demo/staff/orders/$reference")->assertOk()->assertJsonPath('order.workflow.current', 'packaged');
    }

    public function test_production_sending_an_order_back_tells_the_front_desk(): void
    {
        Order::query()->create(['customer_id' => $this->customer->id, 'reference' => 'NY-ALT-BACK', 'category' => 'Alterations', 'status' => 'In production',
            'workflow_stage' => 'in_production', 'sent_to_production_at' => now(), 'specifications' => 'Shorten']);
        $this->signInStaff('production');
        $this->postJson('/api/demo/staff/production/NY-ALT-BACK/return', ['reason' => 'Which sleeve?'])->assertOk();
        $this->assertDatabaseHas('orders', ['reference' => 'NY-ALT-BACK', 'workflow_stage' => 'received', 'status' => 'Order created']);
        Mail::assertSent(StaffOrderAlertMail::class, fn (StaffOrderAlertMail $mail): bool => $mail->hasTo('orders@example.test') && str_contains($mail->body, 'Which sleeve?'));
        $this->signInStaff('receptionist');
        $this->getJson('/api/demo/staff/front-desk/alerts')->assertOk()->assertJsonPath('alerts.0.kind', 'returned')->assertJsonPath('alerts.0.reason', 'Which sleeve?');
    }

    public function test_staff_emails_wait_for_a_delivering_mailer(): void
    {
        config(['mail.default' => 'log']);
        $this->staff('production', 'production@example.test');
        Order::query()->create(['customer_id' => $this->customer->id, 'reference' => 'NY-ALT-LOG', 'category' => 'Alterations', 'status' => 'Order created',
            'workflow_stage' => 'received', 'specifications' => 'Shorten']);
        $this->signInStaff('receptionist');
        $this->postJson('/api/demo/staff/orders/NY-ALT-LOG/send-to-production')->assertOk();
        Mail::assertNothingSent();
    }

    public function test_a_ready_to_wear_purchase_can_become_an_alteration_but_keeps_its_sale(): void
    {
        $order = Order::query()->create(['customer_id' => $this->customer->id, 'reference' => 'NY-RTW-ALTER', 'category' => 'Ready-to-Wear', 'status' => 'Order created',
            'workflow_stage' => 'received', 'payment_status' => 'Paid', 'fulfilment_method' => 'Collection']);
        $order->items()->create(['garment_name' => 'Linen shirt · Size M', 'status' => 'Order created']);
        $this->signInStaff('records');
        $this->postJson('/api/demo/staff/orders/NY-RTW-ALTER/needs-alteration', ['specifications' => 'Shorten sleeves'])->assertForbidden();

        $this->signInStaff('receptionist');
        $this->postJson('/api/demo/staff/orders/NY-RTW-ALTER/needs-alteration', ['specifications' => ''])->assertUnprocessable();
        $this->postJson('/api/demo/staff/orders/NY-RTW-ALTER/needs-alteration', ['specifications' => 'Shorten sleeves 2cm'])->assertOk()
            ->assertJsonPath('order.category', 'Alterations')->assertJsonPath('order.original_category', 'Ready-to-Wear')
            ->assertJsonPath('order.payment_status', 'Paid')->assertJsonPath('order.production.can_send', true);
        $this->postJson('/api/demo/staff/orders/NY-RTW-ALTER/send-to-production')->assertOk()->assertJsonPath('order.workflow.current', 'in_production');
        $this->postJson('/api/demo/staff/orders/NY-RTW-ALTER/needs-alteration', ['specifications' => 'Again'])->assertUnprocessable();

        Order::query()->create(['customer_id' => $this->customer->id, 'reference' => 'NY-RTW-DONE', 'category' => 'Ready-to-Wear', 'status' => 'Collected',
            'workflow_stage' => 'collected', 'completed_at' => now()]);
        $this->postJson('/api/demo/staff/orders/NY-RTW-DONE/needs-alteration', ['specifications' => 'Shorten'])->assertUnprocessable();
    }
}
