<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aulas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grade_horaria_id')->constrained('grades_horarias')->cascadeOnDelete();
            $table->foreignId('componente_curricular_id')->constrained('componentes_curriculares')->cascadeOnDelete();

            // dia da semana em que a aula ocorre (recorrente, toda semana)
            $table->enum('dia_semana', ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo']);

            $table->enum('periodo', ['manha', 'tarde', 'noite']);

            // número do horário dentro do período, conforme colunas do modelo (1º..6º manhã/tarde, 1º..4º noite)
            $table->unsignedTinyInteger('ordem_horario');

            $table->time('hora_inicio');
            $table->time('hora_fim');

            $table->string('codigo_op')->nullable(); // ex: "111" (código da unidade/oferta)

            $table->timestamps();

            $table->index(['grade_horaria_id', 'dia_semana', 'periodo', 'ordem_horario']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aulas');
    }
};