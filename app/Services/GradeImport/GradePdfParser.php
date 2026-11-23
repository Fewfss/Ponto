<?php

namespace App\Services\GradeImport;

use RuntimeException;
use Symfony\Component\Process\Process;

class GradePdfParser implements GradeParserInterface
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
     * Posição horizontal (em unidades do pdftohtml) da coluna "Período" da tabela "Horas Aulas",
     * medida no PDF oficial. As demais colunas são localizadas em relação a ela.
     */
    private const PERIODO_X_REFERENCIA = 604;

    private const TOLERANCIA_COLUNA_PERIODO = 60;

    public function parse(string $pdfPath): array
    {
        $textoLinear = $this->pdftotext($pdfPath);
        $elementos = $this->pdftohtmlElementos($pdfPath);

        // A tabela de disciplinas é lida pela POSIÇÃO de cada texto (nomes de curso longos grudam
        // na coluna seguinte e quebram a leitura por espaços); o texto linear fica como reserva.
        $componentes = $this->extrairComponentesPosicionais($elementos);
        if ($componentes === []) {
            $componentes = $this->extrairComponentesCurriculares($textoLinear);
        }

        return [
            'professor' => $this->extrairProfessor($textoLinear),
            'grade' => $this->extrairDadosGrade($textoLinear),
            'componentes' => $componentes,
            'aulas' => $this->extrairAulasPosicionais($elementos),
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

    /**
     * Roda `pdftohtml -xml` e devolve a lista plana de elementos de texto
     * com suas coordenadas: [['top' => int, 'left' => int, 'width' => int, 'text' => string], ...]
     */
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
                    'page' => (int) $page['number'],
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

        // Se ainda sobrar algum byte inválido, remove só o byte quebrado
        // (melhor perder um caractere isolado do que derrubar a requisição).
        return iconv('UTF-8', 'UTF-8//IGNORE', $convertido);
    }

    // ------------------------------------------------------------------
    // Cabeçalho (professor + validade da grade) — texto linear é suficiente
    // ------------------------------------------------------------------

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

    /**
     * Lê a tabela "Horas Aulas" (Disciplina/Projeto | Curso | Período | Status | Qtde).
     * Cada linha de disciplina é seguida por curso, período, status e quantidade
     * separados por múltiplos espaços — graças ao `-layout` do pdftotext.
     */
    private function extrairComponentesCurriculares(string $texto): array
    {
        $componentes = [];

        $inicio = mb_strpos($texto, 'Horas Aulas');
        $fim = mb_strpos($texto, 'SEGUNDA', $inicio ?: 0);
        $trecho = $inicio !== false ? mb_substr($texto, $inicio, ($fim ?: mb_strlen($texto)) - $inicio) : $texto;

        $linhas = preg_split('/\R/u', $trecho);

        foreach ($linhas as $linha) {
            // Ex.: "ESPANHOL I (Determinada)     Comércio Exterior     Tarde   Ministrando   2"
            $linha = trim($linha);
            if (
                ! preg_match(
                    '/^(?<disciplina>.+?)\s{2,}(?<curso>.+?)\s{2,}(?<periodo>Manh[ãa]|Tarde|Noite)\s{2,}(?<status>\S+)\s{2,}(?<qtde>\d+)\s*$/u',
                    $linha,
                    $m
                )
                // Curso longo encosta na coluna "Período" e sobra só 1 espaço entre eles; nesse caso
                // a disciplina é o que vai até o ")" do "(Determinada)".
                && ! preg_match(
                    '/^(?<disciplina>.+?\([^)]*\))\s+(?<curso>.+?)\s+(?<periodo>Manh[ãa]|Tarde|Noite)\s+(?<status>\S+)\s+(?<qtde>\d+)\s*$/u',
                    $linha,
                    $m
                )
            ) {
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

    /**
     * Lê a tabela "Horas Aulas" pela posição dos textos (pdftohtml): cada linha é ancorada pelo
     * período (Manhã/Tarde/Noite) na coluna "Período" e as demais células são atribuídas às
     * colunas pela posição horizontal em que COMEÇAM, mesmo que um curso longo invada a coluna
     * ao lado ou quebre em duas linhas.
     *
     * @param array<int, array{page: int, top: int, left: int, width: int, text: string}> $elementos
     * @return array<int, array{disciplina: string, curso: ?string, periodo: string, status: ?string, quantidade_aulas: int}>
     */
    private function extrairComponentesPosicionais(array $elementos): array
    {
        $ancoras = [];

        foreach ($elementos as $el) {
            $periodo = $this->periodoDoTexto($el['text']);

            if ($periodo === null || abs($el['left'] - self::PERIODO_X_REFERENCIA) > self::TOLERANCIA_COLUNA_PERIODO) {
                continue;
            }

            // Só vale como linha da tabela se houver, na mesma altura e bem à direita, a coluna Qtde (um número).
            foreach ($elementos as $outro) {
                if (
                    $outro['page'] === $el['page']
                    && abs($outro['top'] - $el['top']) <= 8
                    && $outro['left'] >= $el['left'] + 150
                    && preg_match('/^\d+$/', $outro['text'])
                ) {
                    $ancoras[] = $el + ['periodo' => $periodo];
                    break;
                }
            }
        }

        usort($ancoras, fn ($a, $b) => [$a['page'], $a['top']] <=> [$b['page'], $b['top']]);

        $componentes = [];

        foreach ($ancoras as $i => $ancora) {
            $p = $ancora['left'];
            $proxima = isset($ancoras[$i + 1]) && $ancoras[$i + 1]['page'] === $ancora['page'] ? $ancoras[$i + 1] : null;
            $inicioDaLinha = $ancora['top'] - 10;
            $fimDaLinha = $proxima !== null ? $proxima['top'] - 10 : $ancora['top'] + 35;

            $celulas = ['disciplina' => [], 'curso' => [], 'status' => [], 'qtde' => []];

            foreach ($elementos as $el) {
                if ($el['page'] !== $ancora['page'] || $el['top'] < $inicioDaLinha || $el['top'] >= $fimDaLinha) {
                    continue;
                }

                $coluna = match (true) {
                    $el['left'] < $p - 324 => 'disciplina',
                    $el['left'] < $p - 15 => 'curso',
                    $el['left'] < $p + 40 => null, // a própria célula de período
                    $el['left'] < $p + 176 => 'status',
                    default => 'qtde',
                };

                if ($coluna !== null) {
                    $celulas[$coluna][] = $el;
                }
            }

            $texto = function (array $lista): string {
                usort($lista, fn ($a, $b) => [$a['top'], $a['left']] <=> [$b['top'], $b['left']]);

                return trim(implode(' ', array_column($lista, 'text')));
            };

            $disciplina = $texto($celulas['disciplina']);
            if ($disciplina === '') {
                continue;
            }

            $componentes[] = [
                'disciplina' => $disciplina,
                'curso' => $texto($celulas['curso']) ?: null,
                'periodo' => $ancora['periodo'],
                'status' => $texto($celulas['status']) ?: null,
                'quantidade_aulas' => (int) preg_replace('/\D+/', '', $texto($celulas['qtde'])),
            ];
        }

        return $componentes;
    }

    /** "Manhã"/"Manha", "Tarde" ou "Noite" (sem diferenciar acento ou maiúsculas) -> manha|tarde|noite. */
    private function periodoDoTexto(string $texto): ?string
    {
        $t = mb_strtolower(trim(preg_replace('/[\x{0300}-\x{036F}]/u', '', $texto) ?? $texto));
        $t = strtr($t, ['ã' => 'a', 'á' => 'a']);

        return match ($t) {
            'manha' => 'manha',
            'tarde' => 'tarde',
            'noite' => 'noite',
            default => null,
        };
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

    // ------------------------------------------------------------------
    // Aulas (dia da semana + horário) — precisa de posição (x, y) no PDF
    // ------------------------------------------------------------------

    /**
     * @return array<int, array{disciplina: string, dia_semana: string, periodo: string, hora_inicio: string, hora_fim: string, codigo_op: ?string}>
     */
    private function extrairAulasPosicionais(array $elementos): array
    {
        $aulas = [];
        foreach ($elementos as $el) {
            // Localiza as "caixinhas" de horário, no formato "HH:MM | HH:MM".
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