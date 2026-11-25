<?php

namespace App;

use App\Mail\OrderUpdateMail;
use App\Models\OrderEvent;
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
            if ($event->external_channel === 'email') {
                Mail::to($order->customer->email)->send(new OrderUpdateMail($order->reference, $message, $order->handover_instructions));
            } else {
                Http::withToken(config('order_workflows.sms_token'))->withHeaders(['Idempotency-Key' => 'order-event-'.$event->id])
                    ->connectTimeout(2)->timeout(4)->post(config('order_workflows.sms_endpoint'), [
                        'to' => $order->customer->phone,
                        'message' => 'NY Atelier · '.$order->reference.' · '.($message).($order->handover_instructions ? "\n".$order->handover_instructions : ''),
                    ])->throw();
            }
            $event->update(['external_status' => 'submitted']);
        } catch (Throwable) {
            $event->update(['external_status' => 'failed']);
        }
    }
}
