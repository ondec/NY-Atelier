<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('staff_role', 24)->nullable();
            $table->boolean('staff_active')->default(false);
        });
        Schema::table('studio_sales', fn (Blueprint $table) => $table->foreignId('recorded_by')->nullable()->constrained('users')->restrictOnDelete());
        Schema::create('staff_activation_tokens', function (Blueprint $table) {
            $table->string('hash', 64)->primary();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->timestamp('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_activation_tokens');
        Schema::table('studio_sales', fn (Blueprint $table) => $table->dropConstrainedForeignId('recorded_by'));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['staff_role', 'staff_active']));
    }
};
