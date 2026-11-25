<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** When the person last opened NY Production's notifications; later arrivals count as new. */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('production_seen_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('production_seen_at');
        });
    }
};
