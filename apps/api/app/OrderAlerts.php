<?php

namespace App;

use App\Mail\StaffOrderAlertMail;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

/**
 * Staff emails for the order handoffs (docs/ORDER_FLOWS.md): the production manager when an order is sent to
 * production; the shared front-desk mailbox when production packs it and sends it back, or returns it. The same
 * events show in the NY Production and NY Studio notification bells. Nothing is sent with the log or array mailer.
 */
class OrderAlerts
{
    public static function sentToProduction(Order $order): void
    {
        $managers = User::query()->where('staff_role', 'production')->where('staff_active', true)->whereNotNull('email')->pluck('email')->all();
        self::send($managers, $order, 'New in production', 'A new order is in production.',
            'The front desk has sent this order to production. Assign a tailor and get it started.',
            config('staff.office_url').'/production?order='.rawurlencode($order->reference), 'Open in NY Production');
    }

    public static function backToFrontDesk(Order $order): void
    {
        self::send(array_filter([config('order_workflows.front_desk_email')]), $order, 'Back from production', 'Packed and ready for handover.',
            'Production has finished and packed this order. Arrange the collection or delivery with the customer.',
            config('staff.portal_url').'/showroom?view=fittings&customer='.$order->customer_id, 'Open in NY Studio');
    }

    public static function returnedToFrontDesk(Order $order, string $reason): void
    {
        self::send(array_filter([config('order_workflows.front_desk_email')]), $order, 'Sent back by production', 'Production needs more from the front desk.',
            'Production sent this order back: '.$reason,
            config('staff.portal_url').'/showroom?view=fittings&customer='.$order->customer_id, 'Open in NY Studio');
    }

    /** @param  list<string>  $to */
    private static function send(array $to, Order $order, string $kicker, string $heading, string $body, string $url, string $button): void
    {
        if ($to === [] || ! StaffInvitations::delivers()) {
            return;
        }
        $order->loadMissing(['customer', 'items']);
        $details = array_filter([
            'Order' => $order->reference,
            'Type' => $order->category === 'Custom' ? 'Custom' : $order->category,
            'Customer' => $order->customer->name,
            'Garments' => $order->items->pluck('garment_name')->join(', '),
            'Expected' => $order->expected_completion_date?->format('j F Y'),
            'Handover' => $order->fulfilment_method,
        ]);
        try {
            Mail::to($to)->send(new StaffOrderAlertMail("NY Atelier · {$kicker} · {$order->reference}", $kicker, $heading, $body, $details, $url, $button));
        } catch (Throwable $failure) {
            Log::warning('Order alert email could not be sent.', ['order' => $order->reference, 'error' => $failure::class, 'reason' => Str::limit($failure->getMessage(), 400)]);
        }
    }
}
