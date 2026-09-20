<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grades_horarias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('professor_id')->constrained('professores')->cascadeOnDelete();
            $table->string('semestre')->nullable();       // ex: "1º/2026"
            $table->date('validade_inicio')->nullable();
            $table->date('validade_fim')->nullable();
            $table->unsignedInteger('hora_aula_semanal')->nullable();
            $table->string('arquivo_original')->nullable(); // path do PDF importado (storage)
            $table->json('dados_brutos')->nullable();        // payload extraído, para auditoria/debug
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grades_horarias');
    }
};