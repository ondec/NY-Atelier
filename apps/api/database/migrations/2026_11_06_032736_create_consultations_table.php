<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consultations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('method', 16);
            $table->string('purpose', 150);
            $table->date('preferredDate');
            $table->string('preferredTime', 5);
            $table->text('notes')->nullable();
            $table->string('status', 32);
            $table->json('options')->nullable();
            $table->date('confirmedDate')->nullable();
            $table->string('confirmedTime', 5)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultations');
    }
};
