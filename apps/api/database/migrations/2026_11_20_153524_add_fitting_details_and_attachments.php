<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('customer_measurements', function (Blueprint $table) {
            $table->json('additional_measurements')->nullable();
            $table->string('recorded_unit', 2)->default('cm');
        });
        Schema::create('fitting_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('measurement_id')->constrained('customer_measurements')->cascadeOnDelete();
            $table->string('path');
            $table->string('name', 180);
            $table->string('mime_type', 80);
            $table->unsignedBigInteger('size');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fitting_attachments');
        Schema::table('customer_measurements', function (Blueprint $table) {
            $table->dropColumn(['additional_measurements', 'recorded_unit']);
        });
    }
};
