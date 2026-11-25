<?php

namespace App;

use App\Models\Order;
use App\Models\User;

/**
 * The handover from the front desk to NY Production. A custom or alteration order reaches the production manager
 * only once it has been sent, with its fitting (custom) and specifications in place. Sending approves the design or
 * assessment and starts production; production packages the order and hands it back to the front desk.
 */
class OrderProduction
{
    public const CATEGORIES = ['Custom', 'Alterations'];

    /** Production has nothing left to do: the order is packaged or being handed over. */
    public static function isFinished(Order $order): bool
    {
        if ($order->completed_at !== null) {
            return true;
        }
        $preparation = config('order_workflows.preparation.'.$order->category, []);

        return $order->workflow_stage === 'packaged' || ! in_array($order->workflow_stage, $preparation, true);
    }

    /** The garment is made and inspected (Production done or later). */
    public static function isMade(Order $order): bool
    {
        if (self::isFinished($order)) {
            return true;
        }
        $preparation = config('order_workflows.preparation.'.$order->category, []);
        $current = array_search($order->workflow_stage, $preparation, true);
        $done = array_search('production_done', $preparation, true);

        return $current !== false && $done !== false && $current >= $done;
    }

    /** @return list<string> */
    public static function missing(Order $order): array
    {
        $missing = [];
        if ($order->category === 'Custom' && ! $order->measurement_id) {
            $missing[] = 'Link the customer’s fitting.';
        }
        if (blank($order->specifications)) {
            $missing[] = $order->category === 'Alterations' ? 'Describe the alterations for production.' : 'Write the specifications for production.';
        }

        return $missing;
    }

    /** The sales desk (owner, manager, reception) and whoever created the order may prepare and send it. */
    public static function canPrepare(User $user, Order $order): bool
    {
        return in_array($order->category, self::CATEGORIES, true) && $order->completed_at === null && $order->sent_to_production_at === null
            && ($user->can('staff.sales') || $user->can('staff.orders.manage') || ($order->created_by_id !== null && $order->created_by_id === $user->id));
    }

    /** @return array<string, mixed>|null */
    public static function state(Order $order, ?User $user): ?array
    {
        if (! in_array($order->category, self::CATEGORIES, true)) {
            return null;
        }
        $order->loadMissing('sentToProductionBy');
        $canPrepare = $user !== null && self::canPrepare($user, $order);

        return [
            'sent_at' => $order->sent_to_production_at?->toIso8601String(),
            'sent_by' => $order->sentToProductionBy?->name,
            'returned_at' => $order->returned_from_production_at?->toIso8601String(),
            'return_reason' => $order->production_return_reason,
            'finished' => $order->sent_to_production_at !== null && self::isMade($order),
            'missing' => $order->sent_to_production_at ? [] : self::missing($order),
            'can_prepare' => $canPrepare,
            'can_send' => $canPrepare && self::missing($order) === [],
        ];
    }
}
