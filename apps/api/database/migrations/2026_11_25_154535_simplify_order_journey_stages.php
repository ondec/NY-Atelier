<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * The order journey no longer has separate courier steps: "Ready for delivery" orders go back to Packaged, and
     * orders with a courier arranged, on the way or collected are now "Out for delivery". "Order received" is now
     * "Order created". Saved timeline events keep their original wording.
     */
    public function up(): void
    {
        DB::table('orders')->where('workflow_stage', 'ready_delivery')
            ->update(['workflow_stage' => 'packaged', 'status' => 'Packaged', 'fulfilment_status' => 'Packaged']);
        DB::table('orders')->whereIn('workflow_stage', ['courier_booked', 'courier_en_route', 'courier_collected'])
            ->update(['workflow_stage' => 'out_for_delivery', 'status' => 'Out for delivery', 'fulfilment_status' => 'Out for delivery']);
        DB::table('orders')->where('status', 'Order received')->update(['status' => 'Order created']);
        DB::table('order_items')->where('status', 'Order received')->update(['status' => 'Order created']);
    }

    public function down(): void
    {
        DB::table('orders')->where('status', 'Order created')->update(['status' => 'Order received']);
        DB::table('order_items')->where('status', 'Order created')->update(['status' => 'Order received']);
    }
};
