<?php

namespace App;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Inspiration photos and videos belong to orders; a fitting is only the customer's measurements. */
class OrderInspiration
{
    public const MAX_FILES = 12;

    /** Moves inspiration still saved on the order's fitting (from before inspiration moved to orders). */
    public static function moveFromFitting(Order $order): void
    {
        $files = DB::table('fitting_attachments')->where('measurement_id', $order->measurement_id)->lockForUpdate()->get();
        foreach ($files as $file) {
            DB::table('order_attachments')->insert([
                'id' => $file->id, 'order_id' => $order->id, 'path' => $file->path, 'name' => $file->name,
                'mime_type' => $file->mime_type, 'size' => $file->size, 'created_at' => $file->created_at, 'updated_at' => now(),
            ]);
        }
        DB::table('fitting_attachments')->whereIn('id', $files->pluck('id'))->delete();
    }

    /** Office/Studio staff who create orders, whoever prepares it for production, and production managers may change inspiration. */
    public static function canChange(User $user, Order $order): bool
    {
        return $user->can('staff.orders.manage') || $user->can('staff.production.manage')
            || ($order->category === 'Alterations' && $user->can('staff.alterations.create'))
            || OrderProduction::canPrepare($user, $order);
    }

    /** Order readers, production managers, and the tailor assigned to the order may view it. */
    public static function canView(User $user, Order $order): bool
    {
        return $user->can('staff.orders.read') || $user->can('staff.production.manage')
            || ($user->can('staff.production') && $order->assigned_tailor_id === $user->id);
    }
}
