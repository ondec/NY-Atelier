<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The streamlined order stages agreed with the owner (docs/ORDER_FLOWS.md):
     * - Ready-to-Wear: picking and quality check fold into Packaged, so orders in them return to Order created.
     * - Custom and Alterations: the workroom steps become one "In production" stage. Measurements are confirmed when a
     *   fitting is linked; design approval and the alteration assessment happen when the order is sent to production.
     *   Sent orders that had not started production go back to the front desk to be sent again.
     * Also: an alteration can start life as a Ready-to-Wear sale (original_category), and NY Studio gets its own
     * notification "seen" time.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('original_category', 30)->nullable()->after('category');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('front_desk_seen_at')->nullable();
        });

        $move = function (string $category, array $from, string $to, ?callable $where = null): void {
            $query = DB::table('orders')->where('category', $category)->whereIn('workflow_stage', $from)->whereNull('completed_at');
            if ($where) {
                $where($query);
            }
            $ids = $query->pluck('id');
            $label = ['received' => 'Order created', 'measurements' => 'Measurements confirmed', 'in_production' => 'In production'][$to];
            DB::table('orders')->whereIn('id', $ids)->update(['workflow_stage' => $to, 'status' => $label]);
            DB::table('order_items')->whereIn('order_id', $ids)->whereNull('completed_at')->update(['status' => $label]);
        };

        $move('Ready-to-Wear', ['picking', 'quality_check'], 'received');
        foreach (['Custom', 'Alterations'] as $category) {
            $move($category, ['cutting', 'sewing', 'alterations', 'fitting', 'finishing', 'quality_check'], 'in_production');
        }
        $move('Custom', ['design', 'measurements'], 'measurements', fn ($query) => $query->whereNotNull('measurement_id'));
        $move('Custom', ['design', 'measurements'], 'received', fn ($query) => $query->whereNull('measurement_id'));
        $move('Alterations', ['assessment'], 'received');

        DB::table('orders')->whereIn('category', ['Custom', 'Alterations'])->whereNull('completed_at')->whereNotNull('sent_to_production_at')
            ->whereIn('workflow_stage', ['received', 'measurements'])
            ->update(['sent_to_production_at' => null, 'sent_to_production_by_id' => null]);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('original_category');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('front_desk_seen_at');
        });
    }
};
