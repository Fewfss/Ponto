<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FolhaPonto;
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
            'feriados_extras' => ['nullable', 'array', 'max:31'],
            'feriados_extras.*' => ['date_format:Y-m-d'],
        ]);

        $grade = $validado['grade_horaria_id'] ?? null
            ? $professor->gradesHorarias()->findOrFail($validado['grade_horaria_id'])
            : $professor->gradeAtual();

        abort_if($grade === null, 422, 'Este professor ainda não tem nenhuma grade horária importada.');

        $folha = $this->folhaPontoGenerator->gerar(
            $professor,
            $grade,
            $validado['mes'],
            $validado['ano'],
            $validado['feriados_extras'] ?? [],
        );

        $formato = $validado['formato'] ?? 'docx';

        if ($formato === 'pdf') {
            $folha = $this->folhaPontoGenerator->converterParaPdf($folha);
        }

        return response()->json([
            'folha_ponto' => $folha,
            'download_url' => route('folhas-ponto.download', [
                'folhaPonto' => $folha->id,
                'formato' => $formato,
            ], false),
        ], 201);
    }

    public function download(Request $request, FolhaPonto $folhaPonto)
    {
        $formato = $request->query('formato', 'docx');
        abort_unless(in_array($formato, ['docx', 'pdf'], true), 422, 'Formato inválido (use docx ou pdf).');

        $caminho = $formato === 'pdf' ? $folhaPonto->arquivo_gerado_pdf : $folhaPonto->arquivo_gerado;

        abort_if(
            ! $caminho || ! Storage::exists($caminho),
            404,
            'Arquivo não encontrado. Gere a folha de ponto novamente.'
        );

        return Storage::download($caminho, basename($caminho));
    }
}
