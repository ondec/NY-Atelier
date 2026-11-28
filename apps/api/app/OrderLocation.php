<?php

namespace App;

use App\Models\Order;
use App\Models\User;

/**
 * Which NY Atelier location an order belongs to, and who may send it out for delivery. Operations (and the owner and
 * general manager) dispatch any order; an RTW store receptionist may also dispatch the RTW store's own orders.
 */
class OrderLocation
{
    public const LOCATIONS = ['atelier', 'rtw_store'];

    /** The hand-over steps a receptionist records for their own store's orders. */
    public const RECEPTION_STEPS = ['packaged', 'ready_collection', 'collected'];

    public static function for(Order $order): string
    {
        return $order->store ?? ($order->category === 'Ready-to-Wear' ? 'rtw_store' : 'atelier');
    }

    /** The store a new order belongs to: the creating receptionist's own store, else the default for its type. */
    public static function forNew(?User $creator, string $category): string
    {
        return $creator?->staff_role === 'receptionist' && $creator->staff_location ? $creator->staff_location : ($category === 'Ready-to-Wear' ? 'rtw_store' : 'atelier');
    }

    /** @return array{key: string, name: string, address: string, plus_code: string, map: string} */
    public static function store(Order $order): array
    {
        $key = self::for($order);

        return ['key' => $key, ...config("order_workflows.stores.{$key}")];
    }

    /** A receptionist may record hand-over steps only on their own store's orders; order managers on any. */
    public static function canHandOver(?User $user, Order $order): bool
    {
        if (! $user) {
            return false;
        }
        if ($user->can('staff.orders.manage')) {
            return true;
        }

        return $user->staff_role === 'receptionist' && $user->staff_location !== null && $user->staff_location === self::for($order);
    }

    public static function canDispatch(?User $user, Order $order): bool
    {
        if (! $user) {
            return false;
        }
        if (in_array($user->staff_role, ['owner', 'manager', 'operations'], true)) {
            return true;
        }

        return $user->staff_role === 'receptionist' && $user->staff_location === 'rtw_store' && self::for($order) === 'rtw_store';
    }
}
