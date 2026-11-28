<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Appointments no longer have a "suggested times declined" state: a customer turning down the suggested times sends
 * the request back to the team as a new request. Older requests in that state become new requests.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('consultations')->where('status', 'needs-alternatives')->update(['status' => 'awaiting-confirmation', 'options' => null]);
    }

    public function down(): void
    {
        // Nothing to restore: the old state carried no extra details.
    }
};
