<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FolhaPonto;
use App\Models\Professor;
use App\Services\FolhaPonto\FolhaPontoGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class FolhaPontoController extends Controller
{
    public function __construct(
        private readonly FolhaPontoGenerator $folhaPontoGenerator,
    ) {}

    public function capabilities(): JsonResponse
    {
        return response()->json([
            'pdf_disponivel' => $this->folhaPontoGenerator->pdfDisponivel(),
        ]);
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

    public function downloadZip(Request $request): BinaryFileResponse
    {
        $validado = $request->validate([
            'folha_ponto_ids' => ['required', 'array', 'min:1', 'max:100'],
            'folha_ponto_ids.*' => ['required', 'integer', 'distinct', 'exists:folhas_ponto,id'],
            'formato' => ['required', 'in:docx,pdf'],
        ]);

        $formato = $validado['formato'];
        $folhas = FolhaPonto::query()
            ->with('professor')
            ->whereIn('id', $validado['folha_ponto_ids'])
            ->get();

        /** @var Collection<int, array{nome: string, conteudo: string}> $arquivos */
        $arquivos = $folhas->map(function (FolhaPonto $folha) use ($formato): array {
            $caminho = $formato === 'pdf'
                ? $folha->arquivo_gerado_pdf
                : $folha->arquivo_gerado;

            abort_if(
                ! $caminho || ! Storage::exists($caminho),
                404,
                'Uma das folhas solicitadas não possui o arquivo disponível.'
            );

            $matricula = Str::slug($folha->professor->matricula ?? '') ?: 'sem-matricula';
            $nomeProfessor = Str::slug($folha->professor->nome ?? '') ?: 'professor';
            $nomeArquivo = sprintf(
                '%s-%s-%02d-%04d-%d.%s',
                $matricula,
                $nomeProfessor,
                $folha->mes,
                $folha->ano,
                $folha->id,
                $formato
            );

            return [
                'nome' => $nomeArquivo,
                'conteudo' => Storage::get($caminho),
            ];
        });

        $caminhoZip = tempnam(sys_get_temp_dir(), 'folhas-ponto-');
        if ($caminhoZip === false) {
            throw new RuntimeException('Não foi possível preparar o arquivo ZIP.');
        }

        $zip = new ZipArchive;
        if ($zip->open($caminhoZip, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            unlink($caminhoZip);
            throw new RuntimeException('Não foi possível criar o arquivo ZIP.');
        }

        foreach ($arquivos as $arquivo) {
            if (! $zip->addFromString($arquivo['nome'], $arquivo['conteudo'])) {
                $zip->close();
                unlink($caminhoZip);
                throw new RuntimeException('Não foi possível adicionar uma folha ao arquivo ZIP.');
            }
        }

        if (! $zip->close()) {
            unlink($caminhoZip);
            throw new RuntimeException('Não foi possível finalizar o arquivo ZIP.');
        }

        return response()
            ->download($caminhoZip, 'folhas-ponto.zip', ['Content-Type' => 'application/zip'])
            ->deleteFileAfterSend();
    }
}
