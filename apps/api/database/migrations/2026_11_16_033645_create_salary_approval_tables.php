<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salary_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('label', 100);
            $table->date('period_start');
            $table->date('period_end');
            $table->string('prepared_by', 150);
            $table->string('status', 30)->default('draft');
            $table->unsignedInteger('version')->default(1);
            $table->json('entries');
            $table->string('approved_by', 150)->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->index(['created_at', 'id']);
        });
        Schema::create('salary_events', function (Blueprint $table) {
            $table->id();
            $table->uuid('request_id')->unique();
            $table->foreignUuid('batch_id')->constrained('salary_batches')->restrictOnDelete();
            $table->string('action', 30);
            $table->string('actor', 150);
            $table->text('note')->nullable();
            $table->json('snapshot')->nullable();
            $table->timestamp('created_at');
        });
        Schema::create('salary_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('batch_id')->constrained('salary_batches')->restrictOnDelete();
            $table->uuid('entry_id');
            $table->unsignedBigInteger('amount_minor');
            $table->date('paid_on');
            $table->string('method', 30);
            $table->string('reference', 150);
            $table->string('recorded_by', 150);
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salary_payments');
        Schema::dropIfExists('salary_events');
        Schema::dropIfExists('salary_batches');
    }
};
