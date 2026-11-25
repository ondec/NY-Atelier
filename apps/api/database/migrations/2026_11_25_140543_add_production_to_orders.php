<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Production: specifications for the workroom, the assigned tailor, and inspiration photos and videos that
     * belong to the order (one fitting can serve several orders, each with its own inspiration).
     *
     * Existing fitting inspiration moves to the orders that use that fitting. Files stay where they are on the
     * fittings disk; only the records move. Fittings with no order keep theirs until an order is created from them.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->text('specifications')->nullable()->after('fulfilment_method');
            $table->foreignId('assigned_tailor_id')->nullable()->after('specifications')->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable()->after('assigned_tailor_id');
        });
        Schema::create('order_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('name', 180);
            $table->string('mime_type', 80);
            $table->unsignedBigInteger('size');
            $table->timestamps();
            $table->index(['order_id', 'created_at']);
        });

        DB::transaction(function (): void {
            $links = DB::table('fitting_attachments')->join('orders', 'orders.measurement_id', '=', 'fitting_attachments.measurement_id')
                ->get(['fitting_attachments.*', 'orders.id as order_id']);
            $moved = [];
            foreach ($links as $file) {
                // A fitting used by several orders gives each order its own record of the same file.
                DB::table('order_attachments')->insert([
                    'id' => isset($moved[$file->id]) ? (string) Str::uuid() : $file->id,
                    'order_id' => $file->order_id, 'path' => $file->path, 'name' => $file->name, 'mime_type' => $file->mime_type, 'size' => $file->size,
                    'created_at' => $file->created_at, 'updated_at' => $file->updated_at,
                ]);
                $moved[$file->id] = true;
            }
            DB::table('fitting_attachments')->whereIn('id', $links->pluck('id')->unique())->delete();
        });
    }

    public function down(): void
    {
        DB::transaction(function (): void {
            $files = DB::table('order_attachments')->join('orders', 'orders.id', '=', 'order_attachments.order_id')
                ->whereNotNull('orders.measurement_id')->get(['order_attachments.*', 'orders.measurement_id']);
            foreach ($files->unique('path') as $file) {
                DB::table('fitting_attachments')->insertOrIgnore([
                    'id' => $file->id, 'measurement_id' => $file->measurement_id, 'path' => $file->path, 'name' => $file->name,
                    'mime_type' => $file->mime_type, 'size' => $file->size, 'created_at' => $file->created_at, 'updated_at' => $file->updated_at,
                ]);
            }
        });
        Schema::dropIfExists('order_attachments');
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_tailor_id');
            $table->dropColumn(['specifications', 'assigned_at']);
        });
    }
};
