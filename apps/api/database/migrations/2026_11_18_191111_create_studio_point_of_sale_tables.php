<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('studio_catalogues', function (Blueprint $table) {
            $table->unsignedInteger('id')->primary();
            $table->json('payload');
            $table->unsignedInteger('revision')->default(1);
            $table->timestamps();
        });
        Schema::create('studio_sales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('order_id')->unique()->constrained();
            $table->string('request_hash', 64);
            $table->string('payment_method', 24);
            $table->string('payment_reference', 100)->nullable();
            $table->unsignedBigInteger('total_minor');
            $table->json('receipt');
            $table->timestamps();
            $table->unique(['payment_method', 'payment_reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('studio_sales');
        Schema::dropIfExists('studio_catalogues');
    }
};
