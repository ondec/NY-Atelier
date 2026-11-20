<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('workflow_stage')->nullable();
            $table->unsignedInteger('workflow_version')->default(1);
            $table->text('handover_instructions')->nullable();
            $table->string('courier_name')->nullable();
            $table->string('tracking_reference')->nullable();
        });
        Schema::table('order_events', function (Blueprint $table) {
            $table->string('stage_key')->nullable();
            $table->uuid('action_key')->nullable()->unique();
            $table->string('action_type')->nullable();
            $table->string('request_hash', 64)->nullable();
            $table->timestamp('notified_at')->nullable();
            $table->string('external_channel')->nullable();
            $table->string('external_status')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('order_events', function (Blueprint $table) {
            $table->dropUnique(['action_key']);
            $table->dropColumn(['stage_key', 'action_key', 'action_type', 'request_hash', 'notified_at', 'external_channel', 'external_status']);
        });
        Schema::table('orders', fn (Blueprint $table) => $table->dropColumn(['workflow_stage', 'workflow_version', 'handover_instructions', 'courier_name', 'tracking_reference']));
    }
};
