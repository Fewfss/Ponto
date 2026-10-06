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

    public function store(Request $request, Professor $professor)
    {
        $validado = $request->validate([
            'mes' => ['required', 'integer', 'between:1,12'],
            'ano' => ['required', 'integer', 'min:2000', 'max:2100'],
            'grade_horaria_id' => ['nullable', 'exists:grades_horarias,id'],
            'formato' => ['nullable', 'in:docx,pdf'],
        ]);

        $grade = $validado['grade_horaria_id'] ?? null
            ? $professor->gradesHorarias()->findOrFail($validado['grade_horaria_id'])
            : $professor->gradeAtual();

        abort_if($grade === null, 422, 'Este professor ainda não tem nenhuma grade horária importada.');

        $folha = $this->folhaPontoGenerator->gerar($professor, $grade, $validado['mes'], $validado['ano']);

        $formato = $validado['formato'] ?? 'docx';

        if ($formato === 'pdf') {
            $folha = $this->folhaPontoGenerator->converterParaPdf($folha);
            $urlDownload = Storage::url($folha->arquivo_gerado_pdf);
        } else {
            $urlDownload = Storage::url($folha->arquivo_gerado);
        }

        return response()->json([
            'folha_ponto' => $folha,
            'download_url' => $urlDownload,
        ], 201);
    }
}