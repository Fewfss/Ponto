<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('folhas_ponto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('professor_id')->constrained('professores')->cascadeOnDelete();
            $table->foreignId('grade_horaria_id')->nullable()->constrained('grades_horarias')->nullOnDelete();

            $table->unsignedTinyInteger('mes');   // 1-12
            $table->unsignedSmallInteger('ano');

            $table->string('arquivo_gerado')->nullable(); // path do .docx gerado (storage)
            $table->enum('status', ['gerada', 'erro'])->default('gerada');

            $table->timestamps();

            $table->unique(['professor_id', 'mes', 'ano']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('folhas_ponto');
    }
};