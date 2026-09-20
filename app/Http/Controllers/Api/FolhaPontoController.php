<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Professor;
use App\Services\FolhaPonto\FolhaPontoGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FolhaPontoController extends Controller
{
    public function __construct(
        private readonly FolhaPontoGenerator $folhaPontoGenerator,
    ) {
    }

    /**
     * POST /api/professores/{professor}/folhas-ponto
     * body: { "mes": 9, "ano": 2026, "grade_horaria_id": 12 (opcional) }
     *
     * Gera (ou regera) o .docx da folha de ponto do mês/ano informado e
     * devolve o link para download.
     */
    public function store(Request $request, Professor $professor)
    {
        $validado = $request->validate([
            'mes' => ['required', 'integer', 'between:1,12'],
            'ano' => ['required', 'integer', 'min:2000', 'max:2100'],
            'grade_horaria_id' => ['nullable', 'exists:grades_horarias,id'],
        ]);

        $grade = $validado['grade_horaria_id'] ?? null
            ? $professor->gradesHorarias()->findOrFail($validado['grade_horaria_id'])
            : $professor->gradeAtual();

        abort_if($grade === null, 422, 'Este professor ainda não tem nenhuma grade horária importada.');

        $folha = $this->folhaPontoGenerator->gerar($professor, $grade, $validado['mes'], $validado['ano']);

        return response()->json([
            'folha_ponto' => $folha,
            'download_url' => Storage::url($folha->arquivo_gerado),
        ], 201);
    }
}