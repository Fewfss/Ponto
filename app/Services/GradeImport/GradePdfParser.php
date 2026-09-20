<?php

namespace App\Services\GradeImport;

use RuntimeException;
use Symfony\Component\Process\Process;

class GradePdfParser
{
    
    private const COLUNAS_DIA_REFERENCIA = [
        'segunda' => 127,
        'terca' => 263,
        'quarta' => 384,
        'quinta' => 512,
        'sexta' => 641,
        'sabado' => 759,
    ];

    private const TOLERANCIA_COLUNA_DIA = 80;

    /**
     * @return array{
     *   professor: array{nome: ?string, matricula: ?string, cpf: ?string, regime_juridico: ?string},
     *   grade: array{semestre: ?string, validade_inicio: ?string, validade_fim: ?string},
     *   componentes: array<int, array{disciplina: string, curso: ?string, periodo: string, status: ?string, quantidade_aulas: int}>,
     *   aulas: array<int, array{disciplina: string, dia_semana: string, periodo: string, hora_inicio: string, hora_fim: string, codigo_op: ?string}>,
     * }
     */
    public function parse(string $pdfPath): array
    {
        $textoLinear = $this->pdftotext($pdfPath);

        return [
            'professor' => $this->extrairProfessor($textoLinear),
            'grade' => $this->extrairDadosGrade($textoLinear),
            'componentes' => $this->extrairComponentesCurriculares($textoLinear),
            'aulas' => $this->extrairAulasPosicionais($pdfPath),
        ];
    }

    private function pdftotext(string $pdfPath): string
    {
        $process = new Process(['pdftotext', '-layout', '-enc', 'UTF-8', $pdfPath, '-']);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException('Falha ao executar pdftotext: ' . $process->getErrorOutput());
        }

        return $this->sanitizarUtf8($process->getOutput());
    }

    private function pdftohtmlElementos(string $pdfPath): array
    {
        $process = new Process(['pdftohtml', '-xml', '-i', '-enc', 'UTF-8', '-stdout', $pdfPath]);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException('Falha ao executar pdftohtml: ' . $process->getErrorOutput());
        }

        $xml = simplexml_load_string($this->sanitizarUtf8($process->getOutput()));
        if ($xml === false) {
            throw new RuntimeException('Não foi possível interpretar a saída XML do pdftohtml.');
        }

        $elementos = [];
        foreach ($xml->page as $page) {
            foreach ($page->text as $text) {
                $conteudo = trim((string) $text);
                if ($conteudo === '') {
                    continue;
                }

                $elementos[] = [
                    'top' => (int) $text['top'],
                    'left' => (int) $text['left'],
                    'width' => (int) $text['width'],
                    'text' => $conteudo,
                ];
            }
        }

        return $elementos;
    }

    private function sanitizarUtf8(string $texto): string
    {
        if (mb_check_encoding($texto, 'UTF-8')) {
            return $texto;
        }

        $encodingDetectado = mb_detect_encoding($texto, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true) ?: 'ISO-8859-1';
        $convertido = mb_convert_encoding($texto, 'UTF-8', $encodingDetectado);

        return iconv('UTF-8', 'UTF-8//IGNORE', $convertido);
    }

    private function extrairProfessor(string $texto): array
    {
        return [
            'nome' => $this->capturar('/^NOME\s+(.+?)\s{2,}CPF/mu', $texto),
            'matricula' => $this->capturar('/Matr[ií]cula\s+(\d+)/u', $texto),
            'cpf' => $this->capturar('/CPF\s+([\d.\-]+)/u', $texto),
            'contrato' => $this->capturar('/Contrato\s+(\S+)/u', $texto),
        ];
    }

    private function extrairDadosGrade(string $texto): array
    {
        return [
            'semestre' => $this->capturar('/SEMESTRE\s+(\S+)/u', $texto),
            'validade_inicio' => $this->capturar('/Validade\s+In[ií]cio\s+(\d{2}\/\d{2}\/\d{4})/u', $texto),
            'validade_fim' => $this->capturar('/Validade\s+Fim\s+(\d{2}\/\d{2}\/\d{4})/u', $texto),
        ];
    }

    private function capturar(string $regex, string $texto): ?string
    {
        if (preg_match($regex, $texto, $m)) {
            return trim($m[1]);
        }

        return null;
    }

    private function extrairComponentesCurriculares(string $texto): array
    {
        $componentes = [];

        $inicio = mb_strpos($texto, 'Horas Aulas');
        $fim = mb_strpos($texto, 'SEGUNDA', $inicio ?: 0);
        $trecho = $inicio !== false ? mb_substr($texto, $inicio, ($fim ?: mb_strlen($texto)) - $inicio) : $texto;

        $linhas = preg_split('/\R/u', $trecho);

        foreach ($linhas as $linha) {
            if (! preg_match(
                '/^(?<disciplina>.+?)\s{2,}(?<curso>.+?)\s{2,}(?<periodo>Manh[ãa]|Tarde|Noite)\s{2,}(?<status>\S+)\s{2,}(?<qtde>\d+)\s*$/u',
                trim($linha),
                $m
            )) {
                continue;
            }

            $componentes[] = [
                'disciplina' => trim($m['disciplina']),
                'curso' => trim($m['curso']),
                'periodo' => $this->normalizarPeriodo($m['periodo']),
                'status' => trim($m['status']),
                'quantidade_aulas' => (int) $m['qtde'],
            ];
        }

        return $componentes;
    }

    private function normalizarPeriodo(string $periodo): string
    {
        $p = mb_strtolower($periodo);
        return match (true) {
            str_starts_with($p, 'manh') => 'manha',
            str_starts_with($p, 'tard') => 'tarde',
            default => 'noite',
        };
    }

    /**
     * @return array<int, array{disciplina: string, dia_semana: string, periodo: string, hora_inicio: string, hora_fim: string, codigo_op: ?string}>
     */
    private function extrairAulasPosicionais(string $pdfPath): array
    {
        $elementos = $this->pdftohtmlElementos($pdfPath);

        $aulas = [];
        foreach ($elementos as $el) {
            if (! preg_match('/^(\d{2}):(\d{2})\s*\|\s*(\d{2}:\d{2})$/', $el['text'], $m)) {
                continue;
            }

            $horaInicio = "{$m[1]}:{$m[2]}";
            $horaFim = $m[3];

            $diaSemana = $this->diaPelaPosicaoX($el['left']);
            if ($diaSemana === null) {
                continue;
            }

            $periodo = $this->periodoPeloHorario((int) $m[1]);

            $linhasCaixa = array_values(array_filter($elementos, function ($cand) use ($el) {
                return $cand['top'] > $el['top']
                    && $cand['top'] <= $el['top'] + 70
                    && abs($cand['left'] - $el['left']) < 60;
            }));
            usort($linhasCaixa, fn ($a, $b) => $a['top'] <=> $b['top']);

            $codigoOp = null;
            $disciplina = null;
            foreach ($linhasCaixa as $linha) {
                if ($codigoOp === null && preg_match('/^OP:\s*(\S+)/u', $linha['text'], $mm)) {
                    $codigoOp = $mm[1];
                    continue;
                }
                if ($disciplina === null && $codigoOp !== null && ! preg_match('/^\d+$/', $linha['text'])) {
                    $disciplina = $linha['text'];
                    break;
                }
            }

            $aulas[] = [
                'disciplina' => $disciplina ?? '',
                'dia_semana' => $diaSemana,
                'periodo' => $periodo,
                'hora_inicio' => $horaInicio,
                'hora_fim' => $horaFim,
                'codigo_op' => $codigoOp,
            ];
        }

        return $aulas;
    }

    private function diaPelaPosicaoX(int $left): ?string
    {
        $melhor = null;
        $menorDistancia = PHP_INT_MAX;

        foreach (self::COLUNAS_DIA_REFERENCIA as $dia => $x) {
            $distancia = abs($x - $left);
            if ($distancia < $menorDistancia) {
                $menorDistancia = $distancia;
                $melhor = $dia;
            }
        }

        return $menorDistancia <= self::TOLERANCIA_COLUNA_DIA ? $melhor : null;
    }

    private function periodoPeloHorario(int $hora): string
    {
        return match (true) {
            $hora < 12 => 'manha',
            $hora < 18 => 'tarde',
            default => 'noite',
        };
    }
}