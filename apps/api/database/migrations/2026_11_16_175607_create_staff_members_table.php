<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_members', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->unique();
            $table->string('job_title', 100);
            $table->boolean('salary_eligible')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->foreignId('user_id')->nullable()->unique()->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_members');
    }
};
