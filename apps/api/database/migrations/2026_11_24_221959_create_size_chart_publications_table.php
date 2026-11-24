<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Size charts published from NY Office. One row (id 1) holds the whole publication,
     * protected by a revision number like the shared studio catalogue.
     */
    public function up(): void
    {
        Schema::create('size_chart_publications', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->longText('payload');
            $table->unsignedInteger('revision');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('size_chart_publications');
    }
};
