<?php

namespace Tests\Feature;

use App\Mail\OrderUpdateMail;
use App\Models\Customer;
use App\Models\Order;
use App\OrderWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class DemoOrderWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function order(string $category = 'Ready-to-Wear', ?string $method = 'Collection'): Order
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->freezeTime();
        $customer = Customer::query()->create(['name' => config('demo.customer_name')]);
        $order = $customer->orders()->create(['reference' => 'NY-TEST-1', 'category' => $category, 'status' => 'Order received', 'workflow_stage' => 'received', 'fulfilment_method' => $method]);
        $order->items()->create(['garment_name' => 'Test garment', 'status' => 'Order received']);
        $order->events()->create(['title' => 'Order received', 'stage_key' => 'received', 'action_type' => 'created', 'occurred_at' => now()]);

        return $order->fresh();
    }

    private function payload(Order $order, array $data): array
    {
        return ['request_id' => (string) Str::uuid(), 'version' => $order->fresh()->workflow_version, ...$data];
    }

    private function update(Order $order, array $data): TestResponse
    {
        return $this->patchJson('/api/demo/staff/orders/'.$order->reference.'/workflow', $this->payload($order, $data));
    }

    private function advance(Order $order, string $stage, array $data = []): void
    {
        $this->update($order, ['action' => 'advance', 'stage' => $stage, ...$data])->assertOk()->assertJsonPath('order.workflow.current', $stage);
    }

    private function packaged(Order $order): void
    {
        foreach ($order->items as $item) {
            $this->update($order, ['action' => 'item_ready', 'item_id' => $item->id, 'ready' => true])->assertOk();
        }
        $this->advance($order, 'packaged');
    }

    public function test_collection_requires_ready_garments_and_handover_confirmation_before_completion(): void
    {
        $order = $this->order();
        $this->update($order, ['action' => 'advance', 'stage' => 'packaged'])->assertUnprocessable()->assertJsonValidationErrors('stage');
        $this->assertDatabaseMissing('order_events', ['order_id' => $order->id, 'stage_key' => 'packaged']);
        $this->update($order, ['action' => 'item_ready', 'item_id' => $order->items->first()->id])->assertOk()->assertJsonPath('order.completed_item_count', 1);
        $this->advance($order, 'packaged');
        $this->advance($order, 'ready_collection');
        $this->assertNull($order->fresh()->completed_at);
        $this->update($order, ['action' => 'advance', 'stage' => 'collected'])->assertUnprocessable()->assertJsonValidationErrors('note');
        $this->advance($order, 'collected', ['note' => 'Collected by the customer at the front desk.']);
        $this->assertNotNull($order->fresh()->completed_at);
        $this->getJson('/api/demo/orders')->assertOk()->assertJsonPath('orders.0.status', 'Collected')->assertJsonPath('orders.0.is_complete', true);
        $this->update($order, ['action' => 'advance', 'stage' => 'packaged'])->assertUnprocessable();
    }

    public function test_delivery_goes_out_for_delivery_with_an_address_and_rejects_in_transit_cancellation(): void
    {
        $order = $this->order(method: 'Delivery');
        $this->packaged($order);
        $this->assertSame(['received', 'packaged', 'out_for_delivery', 'delivered'], array_column($this->getJson('/api/demo/staff/orders/NY-TEST-1')->json('order.workflow.steps'), 'key'));
        $this->update($order, ['action' => 'advance', 'stage' => 'out_for_delivery'])->assertUnprocessable()->assertJsonValidationErrors('handover_instructions');
        $this->update($order, ['action' => 'handover', 'fulfilment_method' => 'Delivery', 'tracking_reference' => 'TRACK-100', 'handover_instructions' => 'Sample address; call on arrival.'])->assertOk();
        $this->advance($order, 'out_for_delivery');
        $this->update($order, ['action' => 'handover', 'fulfilment_method' => 'Delivery'])->assertUnprocessable()->assertJsonValidationErrors('handover_instructions');
        $this->update($order, ['action' => 'cancel', 'note' => 'No longer needed'])->assertUnprocessable();
        $this->update($order, ['action' => 'handover', 'fulfilment_method' => 'Collection', 'note' => 'Change method'])->assertUnprocessable();
        $this->advance($order, 'delivered', ['note' => 'Received by the customer.']);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'Delivered', 'fulfilment_status' => 'Delivered', 'tracking_reference' => 'TRACK-100']);
        $this->assertDatabaseHas('order_items', ['order_id' => $order->id, 'status' => 'Delivered']);
    }

    public function test_bespoke_front_desk_steps_move_on_their_own_and_production_steps_wait_for_production(): void
    {
        $order = $this->order('Custom');
        $this->update($order, ['action' => 'advance', 'stage' => 'in_production'])->assertUnprocessable()->assertJsonValidationErrors('stage');
        $this->getJson('/api/demo/staff/orders/NY-TEST-1')->assertOk()->assertJsonPath('order.workflow.can_advance', false)
            ->assertJsonPath('order.workflow.advance_blocked', 'This step moves on its own when the customer’s fitting is linked to the order.');
        $this->update($order, ['action' => 'advance', 'stage' => 'measurements'])->assertForbidden();
        $this->assertSame(['received', 'measurements', 'design', 'in_production', 'production_done', 'packaged', 'ready_collection', 'collected'],
            array_column($this->getJson('/api/demo/staff/orders/NY-TEST-1')->json('order.workflow.steps'), 'key'));

        $order->update(['workflow_stage' => 'in_production', 'status' => 'In production', 'sent_to_production_at' => now()]);
        // The customer sees In production and Production done as one step.
        $customer = $this->getJson('/api/demo/orders')->assertOk()->json('orders.0.workflow');
        $this->assertSame(['received', 'measurements', 'design', 'production', 'packaged', 'ready_collection', 'collected'], array_column($customer['steps'], 'key'));
        $this->assertSame('production', $customer['current']);

        $this->advance($order, 'production_done');
        $this->update($order, ['action' => 'advance', 'stage' => 'packaged'])->assertUnprocessable()->assertJsonValidationErrors('stage');
        $this->update($order, ['action' => 'item_ready', 'item_id' => $order->items->first()->id, 'ready' => true])->assertOk();
        $this->advance($order, 'packaged');
        $this->advance($order, 'ready_collection');
    }

    public function test_alterations_are_assessed_on_send_then_go_straight_into_production(): void
    {
        $order = $this->order('Alterations', null);
        $this->update($order, ['action' => 'advance', 'stage' => 'assessment'])->assertForbidden();
        $this->assertSame(['received', 'assessment', 'in_production', 'production_done', 'packaged'],
            array_column($this->getJson('/api/demo/staff/orders/NY-TEST-1')->json('order.workflow.steps'), 'key'));
        $order->update(['workflow_stage' => 'in_production', 'status' => 'In production', 'sent_to_production_at' => now()]);
        $this->update($order, ['action' => 'item_ready', 'item_id' => $order->items->first()->id, 'ready' => true])->assertOk();
        $this->advance($order, 'production_done');
        $this->advance($order, 'packaged');
        $this->update($order, ['action' => 'advance', 'stage' => 'out_for_delivery'])->assertUnprocessable();
        $this->update($order, ['action' => 'handover', 'fulfilment_method' => 'Collection'])->assertOk();
        $this->advance($order, 'ready_collection');
        $this->getJson('/api/demo/staff/orders')->assertOk()->assertJsonMissing(['key' => 'cutting']);
    }

    public function test_retries_are_idempotent_but_stale_updates_and_reused_identifiers_are_rejected(): void
    {
        $order = $this->order();
        $this->update($order, ['action' => 'item_ready', 'item_id' => $order->items->first()->id, 'ready' => true])->assertOk();
        $payload = $this->payload($order, ['action' => 'advance', 'stage' => 'packaged']);
        $url = '/api/demo/staff/orders/'.$order->reference.'/workflow';
        $this->patchJson($url, $payload)->assertOk();
        $this->patchJson($url, $payload)->assertOk();
        $this->assertDatabaseCount('order_events', 3);
        $this->patchJson($url, [...$payload, 'note' => 'Different request'])->assertConflict();
        $this->patchJson($url, [...$payload, 'request_id' => (string) Str::uuid(), 'stage' => 'ready_collection'])->assertConflict();
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'workflow_version' => 3, 'workflow_stage' => 'packaged']);
    }

    public function test_garment_readiness_is_scoped_and_cannot_change_after_packaging(): void
    {
        $order = $this->order();
        $other = $order->replicate();
        $other->reference = 'NY-OTHER';
        $other->save();
        $item = $other->items()->create(['garment_name' => 'Other garment', 'status' => 'Order received']);
        $this->update($order, ['action' => 'item_ready', 'item_id' => $item->id])->assertNotFound();
        $this->packaged($order);
        $this->update($order, ['action' => 'item_ready', 'item_id' => $order->items->first()->id, 'ready' => false, 'note' => 'Check again'])->assertUnprocessable();
    }

    public function test_customer_updates_prefer_email_over_sms_and_do_not_resend_on_retry(): void
    {
        Mail::fake();
        Http::preventStrayRequests();
        $order = $this->order();
        $order->customer->update(['email' => 'sample@example.test', 'phone' => '+233200000001']);
        config(['order_workflows.email_enabled' => true, 'mail.default' => 'smtp']);
        $this->packaged($order);
        $this->advance($order, 'ready_collection', ['notify' => true, 'note' => 'Please collect after 3 pm.']);
        $this->update($order, ['action' => 'notify'])->assertOk()->assertJsonPath('notification.channel', 'email')->assertJsonPath('notification.status', 'submitted');
        Mail::assertSent(OrderUpdateMail::class, fn (OrderUpdateMail $mail): bool => $mail->hasTo('sample@example.test') && str_contains($mail->update, 'Ready for collection') && str_contains($mail->update, '3 pm'));
        Mail::assertSentCount(1);
        Http::assertNothingSent();
        $this->getJson('/api/demo/orders')->assertOk()->assertJsonPath('orders.0.workflow.can_manage', false);
        $event = collect($this->getJson('/api/demo/orders')->json('orders.0.timeline'))->firstWhere('title', 'Ready for collection');
        $this->assertNotNull($event['notified_at']);
        $this->assertArrayNotHasKey('notification', $event);
    }

    public function test_sms_is_selected_only_when_there_is_no_email_and_failure_keeps_the_app_update(): void
    {
        Mail::fake();
        Http::preventStrayRequests();
        Http::fake(['https://sms.example.test/send' => Http::sequence()->push([], 503)->push(['accepted' => true], 200)]);
        config(['order_workflows.sms_endpoint' => 'https://sms.example.test/send', 'order_workflows.sms_token' => 'test-token']);
        $order = $this->order();
        $order->customer->update(['phone' => '+233200000001']);
        $this->update($order, ['action' => 'notify'])->assertOk()->assertJsonPath('notification.channel', 'sms')->assertJsonPath('notification.status', 'failed');
        $this->assertDatabaseHas('order_events', ['order_id' => $order->id, 'external_status' => 'failed']);
        $this->assertNotNull($order->events()->where('action_type', 'notify')->first()->notified_at);
        Http::assertSent(fn ($request): bool => $request->url() === 'https://sms.example.test/send' && $request['to'] === '+233200000001');
        Mail::assertNothingSent();
        $this->update($order, ['action' => 'notify'])->assertOk()->assertJsonPath('notification.status', 'submitted');
        $this->assertDatabaseCount('order_events', 2);
    }

    public function test_email_failure_is_reported_without_silently_switching_to_sms(): void
    {
        Http::preventStrayRequests();
        $order = $this->order();
        $order->customer->update(['email' => 'sample@example.test', 'phone' => '+233200000001']);
        config(['order_workflows.email_enabled' => true, 'mail.default' => 'smtp']);
        Mail::shouldReceive('to')->once()->with('sample@example.test')->andThrow(new \RuntimeException('Mail unavailable'));
        $this->update($order, ['action' => 'notify'])->assertOk()->assertJsonPath('notification.channel', 'email')->assertJsonPath('notification.status', 'failed');
        $this->assertDatabaseHas('order_events', ['order_id' => $order->id, 'external_status' => 'failed']);
        Http::assertNothingSent();
    }

    public function test_unconfigured_channels_and_missing_contacts_are_not_reported_as_sent(): void
    {
        Mail::fake();
        Http::preventStrayRequests();
        $order = $this->order();
        $this->update($order, ['action' => 'notify'])->assertOk()->assertJsonPath('notification.status', 'no_contact');
        $order->customer->update(['email' => 'sample@example.test']);
        $this->update($order, ['action' => 'notify'])->assertOk()->assertJsonPath('notification.status', 'not_connected');
        Mail::assertNothingSent();
        Http::assertNothingSent();
    }

    public function test_an_old_stage_notification_is_not_resent_after_the_order_has_moved_on(): void
    {
        Mail::fake();
        $order = $this->order();
        $payload = $this->payload($order, ['action' => 'notify']);
        $url = '/api/demo/staff/orders/'.$order->reference.'/workflow';
        $this->patchJson($url, $payload)->assertOk()->assertJsonPath('notification.status', 'no_contact');
        // Ready for collection is a main stage, so it sends a newer customer update.
        $this->packaged($order);
        $this->advance($order, 'ready_collection');
        $order->customer->update(['email' => 'sample@example.test']);
        config(['order_workflows.email_enabled' => true, 'mail.default' => 'smtp']);
        $this->patchJson($url, $payload)->assertOk()->assertJsonPath('notification.status', 'superseded');
        Mail::assertNothingSent();
    }

    public function test_private_notes_are_not_exposed_or_notified_to_the_customer(): void
    {
        $order = $this->order();
        $this->update($order, ['action' => 'note', 'note' => 'Internal workshop note', 'client_visible' => false, 'notify' => true])->assertOk()->assertJsonPath('notification', null);
        $this->getJson('/api/demo/orders')->assertOk()->assertJsonMissing(['explanation' => 'Internal workshop note']);
        $this->getJson('/api/demo/staff/orders')->assertOk()->assertJsonFragment(['explanation' => 'Internal workshop note']);
    }

    public function test_hosted_staff_writes_work_and_cancellation_requires_a_reason(): void
    {
        $order = $this->order();
        $this->update($order, ['action' => 'cancel'])->assertUnprocessable()->assertJsonValidationErrors('note');
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.1']);
        $this->update($order, ['action' => 'cancel', 'note' => 'Customer requested cancellation'])->assertOk()->assertJsonPath('order.status', 'Cancelled');
        config(['demo.enabled' => false]);
        $this->update($order, ['action' => 'note', 'note' => 'Still allowed for staff'])->assertOk();
    }

    public function test_order_details_load_the_latest_record_and_refuse_unknown_reads(): void
    {
        $order = $this->order();
        $this->packaged($order);
        $url = '/api/demo/staff/orders/'.$order->reference;
        $this->getJson($url)->assertOk()->assertJsonPath('order.workflow.current', 'packaged');
        $this->getJson('/api/demo/staff/orders/UNKNOWN')->assertNotFound();
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.1'])->getJson($url)->assertOk();
    }

    public function test_legacy_history_is_not_fabricated_and_mail_escapes_customer_text(): void
    {
        $order = $this->order('Custom');
        $order->update(['workflow_stage' => null, 'status' => 'Your outfit is being made']);
        $state = (new OrderWorkflow)->describe($order->load('events', 'customer'), true);
        $this->assertTrue($state['legacy']);
        $this->assertSame('in_production', $state['current']);
        $this->assertNull(collect($state['steps'])->firstWhere('key', 'in_production')['recorded_at']);
        (new OrderUpdateMail('NY-TEST-1', '<script>test</script>', 'Front desk'))->assertSeeInHtml('&lt;script&gt;test&lt;/script&gt;', false);
    }
}
