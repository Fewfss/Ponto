<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GradeImport\GradeDocxParser;
use App\Services\GradeImport\GradeImportService;
use App\Services\GradeImport\GradePdfParser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class GradeImportController extends Controller
{
    public function __construct(
        private readonly GradeImportService $gradeImportService,
        private readonly GradePdfParser $pdfParser,
        private readonly GradeDocxParser $docxParser,
    ) {}

    /**
     * POST /api/grades  (multipart/form-data, campo "arquivo")
     *
     * Recebe a grade em PDF ou DOCX, extrai os dados (com o parser certo
     * pra cada formato) e devolve a grade horária já salva (professor +
     * disciplinas + aulas), pronta para gerar a folha de ponto de qualquer mês.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'arquivo' => ['required', 'file', 'mimes:pdf,docx', 'max:10240'],
        ]);

        $arquivo = $request->file('arquivo');
        $caminhoArmazenado = $arquivo->store('grades-importadas');

        if ($caminhoArmazenado === false) {
            throw new RuntimeException('Não foi possível armazenar o arquivo enviado.');
        }

        try {
            $caminhoAbsoluto = Storage::path($caminhoArmazenado);

            $parser = match (strtolower($arquivo->getClientOriginalExtension())) {
                'pdf' => $this->pdfParser,
                'docx' => $this->docxParser,
                default => throw new InvalidArgumentException('Formato de arquivo não suportado.'),
            };

            $dados = $parser->parse($caminhoAbsoluto);
            $grade = $this->gradeImportService->importar($dados, $caminhoArmazenado);
        } catch (Throwable $exception) {
            try {
                if (Storage::exists($caminhoArmazenado) && ! Storage::delete($caminhoArmazenado)) {
                    Log::error('Não foi possível remover um arquivo de grade após falha na importação.', [
                        'caminho' => $caminhoArmazenado,
                        'exception' => $exception,
                    ]);
                }
            } catch (Throwable $cleanupException) {
                Log::error('Falha ao limpar arquivo de grade após erro na importação.', [
                    'caminho' => $caminhoArmazenado,
                    'exception' => $exception,
                    'cleanup_exception' => $cleanupException,
                ]);
            }

            throw $exception;
        }

        return response()->json([
            'grade_horaria' => $grade,
        ], 201);
    }
}
