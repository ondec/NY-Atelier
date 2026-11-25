<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Where a Delivery order goes: who receives it, the address, a GhanaPost GPS code,
     * directions for the rider, and an optional map pin.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('delivery_recipient_name', 100)->nullable()->after('fulfilment_method');
            $table->string('delivery_phone', 30)->nullable()->after('delivery_recipient_name');
            $table->string('delivery_address', 255)->nullable()->after('delivery_phone');
            $table->string('delivery_area', 100)->nullable()->after('delivery_address');
            $table->string('delivery_gps_code', 20)->nullable()->after('delivery_area');
            $table->text('delivery_directions')->nullable()->after('delivery_gps_code');
            $table->decimal('delivery_latitude', 9, 6)->nullable()->after('delivery_directions');
            $table->decimal('delivery_longitude', 9, 6)->nullable()->after('delivery_latitude');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['delivery_recipient_name', 'delivery_phone', 'delivery_address', 'delivery_area', 'delivery_gps_code', 'delivery_directions', 'delivery_latitude', 'delivery_longitude']);
        });
    }
};
