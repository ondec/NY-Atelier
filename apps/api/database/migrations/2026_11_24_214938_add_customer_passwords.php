<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Customers may add an email password. It is only set after the customer proves they own the
     * email (code or link), so the pending hash waits on the sign-in challenge until then.
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('password')->nullable()->after('email');
            $table->timestamp('password_changed_at')->nullable()->after('password');
        });
        Schema::table('customer_sign_in_challenges', function (Blueprint $table) {
            $table->string('password_hash')->nullable()->after('link_hash');
        });
    }

    public function down(): void
    {
        Schema::table('customer_sign_in_challenges', function (Blueprint $table) {
            $table->dropColumn('password_hash');
        });
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['password', 'password_changed_at']);
        });
    }
};
