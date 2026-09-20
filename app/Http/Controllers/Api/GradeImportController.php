<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GradeImport\GradeImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class GradeImportController extends Controller
{
    public function __construct(
        private readonly GradeImportService $gradeImportService,
    ) {
    }

    /**
     * POST /api/grades  (multipart/form-data, campo "arquivo")
     *
     * Recebe o PDF da grade, extrai os dados e devolve a grade horária já
     * salva (professor + disciplinas + aulas), pronta para gerar a folha de
     * ponto de qualquer mês.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'arquivo' => ['required', 'file', 'mimes:pdf', 'max:10240'],
        ]);

        $caminhoArmazenado = $request->file('arquivo')->store('grades-importadas');
        $caminhoAbsoluto = Storage::path($caminhoArmazenado);

        $grade = $this->gradeImportService->importar($caminhoArmazenado, $caminhoAbsoluto);

        return response()->json([
            'grade_horaria' => $grade,
        ], 201);
    }
}