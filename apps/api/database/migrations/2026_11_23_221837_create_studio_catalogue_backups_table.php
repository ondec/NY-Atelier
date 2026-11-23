<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Copies of the shared catalogue taken before an owner imports products, so the import can be undone. */
    public function up(): void
    {
        Schema::create('studio_catalogue_backups', function (Blueprint $table) {
            $table->id();
            $table->string('reason', 50);
            $table->unsignedInteger('revision_before');
            $table->unsignedInteger('revision_after');
            $table->json('payload');
            $table->json('summary');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('restored_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('studio_catalogue_backups');
    }
};
