<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Extra garment pieces measured in the same fitting (e.g. a shirt with a suit). Each piece has its own
     * readings in centimetres: [{key, title, values: {field: cm}}]. Its custom readings stay in additional_measurements
     * with the piece title as their group.
     */
    public function up(): void
    {
        Schema::table('customer_measurements', function (Blueprint $table) {
            $table->json('pieces')->nullable()->after('additional_measurements');
        });
    }

    public function down(): void
    {
        Schema::table('customer_measurements', function (Blueprint $table) {
            $table->dropColumn('pieces');
        });
    }
};
