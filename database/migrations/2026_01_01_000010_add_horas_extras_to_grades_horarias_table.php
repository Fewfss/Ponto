<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('grades_horarias', function (Blueprint $table) {
            // Campos do cabeçalho da folha de ponto que não vêm do PDF da grade:
            // digitados na tela de Folha e preenchidos no modelo .docx.
            $table->string('hora_atividade', 50)->nullable()->after('hora_aula_semanal');
            $table->string('hae_projeto', 50)->nullable()->after('hora_atividade');
            $table->string('hae_coordenacao', 50)->nullable()->after('hae_projeto');
        });
    }

    public function down(): void
    {
        Schema::table('grades_horarias', function (Blueprint $table) {
            $table->dropColumn(['hora_atividade', 'hae_projeto', 'hae_coordenacao']);
        });
    }
};
