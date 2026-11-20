<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('email')->nullable()->unique();
            $table->string('phone', 40)->nullable();
            $table->string('account_reference', 100)->nullable()->unique();
        });
        Schema::create('customer_measurements', function (Blueprint $table) {
            $table->id();
            $table->uuid('request_id')->unique();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->date('measured_on');
            $table->json('values');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['customer_id', 'measured_on', 'id']);
        });
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('measurement_id')->nullable()->constrained('customer_measurements')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', fn (Blueprint $table) => $table->dropConstrainedForeignId('measurement_id'));
        Schema::dropIfExists('customer_measurements');
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique(['email']);
            $table->dropUnique(['account_reference']);
            $table->dropColumn(['email', 'phone', 'account_reference']);
        });
    }
};
