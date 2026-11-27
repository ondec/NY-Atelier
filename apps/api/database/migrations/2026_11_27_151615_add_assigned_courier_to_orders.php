<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** A delivery order can be assigned to a delivery courier's staff account. */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('assigned_courier_id')->nullable()->after('tracking_reference')->constrained('users')->nullOnDelete();
            $table->timestamp('courier_assigned_at')->nullable()->after('assigned_courier_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_courier_id');
            $table->dropColumn('courier_assigned_at');
        });
    }
};
