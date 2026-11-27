<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Delivery areas: each promises a delivery window in days from when the order is placed.
        Schema::create('delivery_zones', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80)->unique();
            $table->unsignedSmallInteger('min_days');
            $table->unsignedSmallInteger('max_days');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // Shops and other places a courier can start a route from.
        Schema::create('delivery_start_points', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->string('address', 255)->nullable();
            $table->decimal('latitude', 9, 6);
            $table->decimal('longitude', 9, 6);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('delivery_zone_id')->nullable()->after('delivery_area')->constrained('delivery_zones')->nullOnDelete();
            $table->date('delivery_due_from')->nullable()->after('delivery_zone_id');
            $table->date('delivery_due_by')->nullable()->after('delivery_due_from');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('delivery_zone_id');
            $table->dropColumn(['delivery_due_from', 'delivery_due_by']);
        });
        Schema::dropIfExists('delivery_start_points');
        Schema::dropIfExists('delivery_zones');
    }
};
