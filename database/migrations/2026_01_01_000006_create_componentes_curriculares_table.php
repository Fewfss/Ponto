<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('componentes_curriculares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grade_horaria_id')->constrained('grades_horarias')->cascadeOnDelete();
            $table->string('disciplina');   // ex: ESPANHOL I
            $table->string('curso')->nullable();       // ex: Comércio Exterior
            $table->enum('periodo', ['manha', 'tarde', 'noite']);
            $table->string('status')->nullable();      // ex: Ministrando
            $table->unsignedTinyInteger('quantidade_aulas')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('componentes_curriculares');
    }
};