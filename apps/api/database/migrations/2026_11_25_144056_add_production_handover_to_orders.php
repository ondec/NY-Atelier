<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Custom and alteration orders reach NY Production only once the front desk sends them, with the fitting,
     * specifications and design approval in place. The production manager can send one back with a reason.
     *
     * Orders that already existed stay in production, so nothing disappears from the workroom.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('created_by_id')->nullable()->after('source')->constrained('users')->nullOnDelete();
            $table->timestamp('sent_to_production_at')->nullable()->after('assigned_at');
            $table->foreignId('sent_to_production_by_id')->nullable()->after('sent_to_production_at')->constrained('users')->nullOnDelete();
            $table->timestamp('returned_from_production_at')->nullable()->after('sent_to_production_by_id');
            $table->string('production_return_reason', 1000)->nullable()->after('returned_from_production_at');
            $table->index(['category', 'sent_to_production_at']);
        });

        DB::table('orders')->whereIn('category', ['Custom', 'Alterations'])->update(['sent_to_production_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['category', 'sent_to_production_at']);
            $table->dropConstrainedForeignId('created_by_id');
            $table->dropConstrainedForeignId('sent_to_production_by_id');
            $table->dropColumn(['sent_to_production_at', 'returned_from_production_at', 'production_return_reason']);
        });
    }
};
