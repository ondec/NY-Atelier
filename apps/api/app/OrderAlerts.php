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
    /** @return list<string> The store's own front-desk inbox, else the shared one. */
    private static function frontDesk(Order $order): array
    {
        $key = OrderLocation::for($order);

        return array_values(array_filter([config("order_workflows.stores.{$key}.email") ?: config('order_workflows.front_desk_email')]));
    }

    public static function sentToProduction(Order $order): void
    {
        $managers = User::query()->where('staff_role', 'production')->where('staff_active', true)->whereNotNull('email')->pluck('email')->all();
        self::send($managers, $order, 'New in production', 'A new order is in production.',
            'The front desk has sent this order to production. Everything production needs is below; assign a tailor and get it started.',
            config('staff.office_url').'/production?order='.rawurlencode($order->reference), 'Open in NY Production', ProductionBrief::sections($order));
    }

    public static function backToFrontDesk(Order $order): void
    {
        self::send(self::frontDesk($order), $order, 'Back from production', 'Packed and ready for handover.',
            'Production has finished and packed this order. Arrange the collection or delivery with the customer.',
            config('staff.portal_url').'/showroom?view=fittings&customer='.$order->customer_id, 'Open in NY Studio');
    }

    /** A packaged delivery order no courier has yet: every active courier is told it is waiting at the store. */
    public static function readyForCourier(Order $order): void
    {
        if ($order->fulfilment_method !== 'Delivery' || $order->assigned_courier_id !== null) {
            return;
        }
        $store = OrderLocation::store($order);
        $couriers = User::query()->where('staff_role', 'courier')->where('staff_active', true)->whereNotNull('email')->pluck('email')->all();
        self::send($couriers, $order, 'Ready for pick-up', "Waiting at the {$store['name']}.",
            "This order is packed and ready. Collect it from the {$store['name']} ({$store['address']}) and deliver it.",
            config('staff.portal_url').'/deliveries', 'Open Deliveries');
    }

    public static function toPackage(Order $order): void
    {
        self::send(self::frontDesk($order), $order, 'To package', 'Ready to package for handover.',
            'Production has finished this order and sent it to reception unpackaged. Package it, then arrange the collection or delivery.',
            config('staff.portal_url').'/showroom?view=orders', 'Open in NY Studio');
    }

    public static function returnedToFrontDesk(Order $order, string $reason): void
    {
        self::send(self::frontDesk($order), $order, 'Sent back by production', 'Production needs more from the front desk.',
            'Production sent this order back: '.$reason,
            config('staff.portal_url').'/showroom?view=fittings&customer='.$order->customer_id, 'Open in NY Studio');
    }

    /**
     * @param  list<string>  $to
     * @param  list<array{title: string, rows?: array<string, string>, text?: string}>  $sections
     */
    private static function send(array $to, Order $order, string $kicker, string $heading, string $body, string $url, string $button, array $sections = []): void
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
            Mail::to($to)->send(new StaffOrderAlertMail("NY Atelier · {$kicker} · {$order->reference}", $kicker, $heading, $body, $details, $url, $button, $sections));
        } catch (Throwable $failure) {
            Log::warning('Order alert email could not be sent.', ['order' => $order->reference, 'error' => $failure::class, 'reason' => Str::limit($failure->getMessage(), 400)]);
        }
    }
}
