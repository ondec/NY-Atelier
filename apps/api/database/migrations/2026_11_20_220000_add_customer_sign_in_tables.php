<?php

use App\CustomerSignIn;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('phone_e164', 20)->nullable()->index();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->timestamp('first_signed_in_at')->nullable();
            $table->timestamp('last_signed_in_at')->nullable();
        });

        // Adds a normalized copy of existing phone numbers; the original phone text is not changed.
        DB::table('customers')->whereNotNull('phone')->orderBy('id')->each(function ($row) {
            DB::table('customers')->where('id', $row->id)->update(['phone_e164' => CustomerSignIn::normalizePhone($row->phone)]);
        });

        Schema::create('customer_sign_in_challenges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('channel', 16);
            $table->string('destination', 254);
            $table->string('code_hash', 64);
            $table->string('link_hash', 64)->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamps();
            $table->index(['destination', 'created_at']);
        });

        Schema::create('customer_auth_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('type', 40);
            $table->string('channel', 16)->nullable();
            $table->json('details')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamps();
            $table->index(['customer_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_auth_events');
        Schema::dropIfExists('customer_sign_in_challenges');
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['phone_e164']);
            $table->dropColumn(['phone_e164', 'email_verified_at', 'phone_verified_at', 'first_signed_in_at', 'last_signed_in_at']);
        });
    }
};
