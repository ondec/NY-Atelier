<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run outside a transaction so a refused CREATE EXTENSION cannot abort the deploy's migrations.
     */
    public $withinTransaction = false;

    /** @var list<string> */
    private const SEARCHED = ['name', 'email', 'phone', 'account_reference'];

    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            $table->index(['name', 'id'], 'customers_name_id_index');
        });

        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        try {
            DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        } catch (Throwable $exception) {
            Log::warning('Customer search runs without trigram indexes: pg_trgm could not be enabled.', ['error' => $exception::class]);

            return;
        }

        foreach (self::SEARCHED as $column) {
            DB::statement("CREATE INDEX IF NOT EXISTS customers_{$column}_trgm_index ON customers USING gin (LOWER({$column}) gin_trgm_ops)");
        }
        DB::statement('CREATE INDEX IF NOT EXISTS customers_phone_e164_trgm_index ON customers USING gin (phone_e164 gin_trgm_ops)');
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            foreach ([...self::SEARCHED, 'phone_e164'] as $column) {
                DB::statement("DROP INDEX IF EXISTS customers_{$column}_trgm_index");
            }
        }

        Schema::table('customers', function (Blueprint $table): void {
            $table->dropIndex('customers_name_id_index');
        });
    }
};
