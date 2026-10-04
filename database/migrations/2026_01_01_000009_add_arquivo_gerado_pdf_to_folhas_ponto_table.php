<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('folhas_ponto', function (Blueprint $table) {
            $table->string('arquivo_gerado_pdf')->nullable()->after('arquivo_gerado');
        });
    }

    public function down(): void
    {
        Schema::table('folhas_ponto', function (Blueprint $table) {
            $table->dropColumn('arquivo_gerado_pdf');
        });
    }
};