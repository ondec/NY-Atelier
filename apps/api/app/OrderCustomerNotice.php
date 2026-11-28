<?php

namespace App;

use App\Mail\OrderUpdateMail;
use App\Models\Order;
use App\Models\OrderEvent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Throwable;

class OrderCustomerNotice
{
    public function __construct(private OrderWorkflow $workflow) {}

    public function send(OrderEvent $event): void
    {
        $claimed = DB::transaction(function () use ($event): bool {
            $event->refresh();
            if (! $event->notified_at || in_array($event->external_status, ['submitted', 'submitting'], true)) {
                return false;
            }
            $event->load('order.customer');
            // A newer customer update replaces this one (e.g. the order moved on before this was sent).
            if (OrderEvent::query()->where('order_id', $event->order_id)->where('id', '>', $event->id)->whereNotNull('notified_at')->exists()) {
                $event->update(['external_status' => 'superseded']);

                return false;
            }
            $customer = $event->order->customer;
            $channel = $customer->email ? 'email' : ($customer->phone ? 'sms' : null);
            $configured = $channel === 'email'
                ? config('order_workflows.email_enabled') && ! in_array(config('mail.default'), ['log', 'array', 'failover', 'roundrobin'], true)
                : $channel === 'sms' && config('order_workflows.sms_endpoint') && config('order_workflows.sms_token');
            $status = ! $channel ? 'no_contact' : (! $configured ? 'not_connected' : 'submitting');
            $updated = OrderEvent::query()->whereKey($event->id)->whereNotIn('external_status', ['submitted', 'submitting'])->update(['external_channel' => $channel, 'external_status' => $status]);
            $event->refresh();

            return $updated === 1 && $configured;
        });
        if (! $claimed) {
            return;
        }
        try {
            $event->load('order.customer');
            $order = $event->order;
            $message = $event->action_type === 'notify' ? $event->explanation : $event->title.($event->explanation ? ' · '.$event->explanation : '');
            if ($event->stage_key === 'ready_collection') {
                // Tell the customer which store to collect from.
                $store = OrderLocation::store($order);
                $message .= " · Collect from {$store['name']}, {$store['address']} ({$store['plus_code']}). Directions: {$store['map']}";
            }
            if ($event->external_channel === 'email') {
                Mail::to($order->customer->email)->send(new OrderUpdateMail($order->reference, $message, $order->handover_instructions, $this->timeline($order), $this->expectedDelivery($order)));
            } else {
                Http::withToken(config('order_workflows.sms_token'))->withHeaders(['Idempotency-Key' => 'order-event-'.$event->id])
                    ->connectTimeout(2)->timeout(4)->post(config('order_workflows.sms_endpoint'), [
                        'to' => $order->customer->phone,
                        'message' => 'NY Atelier · '.$order->reference.' · '.($message).($order->handover_instructions ? "\n".$order->handover_instructions : '').(($expected = $this->expectedDelivery($order)) ? "\n".$expected : ''),
                    ])->throw();
            }
            $event->update(['external_status' => 'submitted']);
        } catch (Throwable) {
            $event->update(['external_status' => 'failed']);
        }
    }

    /**
     * The order's progress for the email: every customer stage, ticked when done, the current one marked, the rest to come.
     *
     * @return list<array{label: string, state: string, date: ?string, note: ?string}>
     */
    public function timeline(Order $order): array
    {
        $order->load('events');
        $described = $this->workflow->describe($order, false);

        return array_map(fn (array $step): array => [
            'label' => $step['label'],
            'state' => $step['is_current'] ? 'current' : match ($step['state']) {
                'recorded', 'unrecorded' => 'done', 'skipped' => 'skipped', default => 'upcoming'
            },
            'date' => $step['recorded_at'] ? Carbon::parse($step['recorded_at'])->format('j M') : null,
            'note' => $step['note'] ?? null,
        ], $described['steps']);
    }

    /** When a delivery order should arrive (from its delivery area), until it is delivered: "Expected delivery: Tue 2 – Thu 3 Dec". */
    public function expectedDelivery(Order $order): ?string
    {
        if ($order->fulfilment_method !== 'Delivery' || ! $order->delivery_due_by || $order->completed_at || $order->status === 'cancelled') {
            return null;
        }
        $from = $order->delivery_due_from;
        $by = $order->delivery_due_by;
        if (! $from || $from->isSameDay($by)) {
            return 'Expected delivery: '.$by->format('D j M');
        }

        return 'Expected delivery: '.$from->format($from->isSameMonth($by) ? 'D j' : 'D j M').' – '.$by->format('D j M');
    }
}
