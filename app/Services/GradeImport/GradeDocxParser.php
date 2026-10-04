<?php

namespace App\Services\GradeImport;

use PhpOffice\PhpWord\Element\AbstractContainer;
use PhpOffice\PhpWord\Element\Cell;
use PhpOffice\PhpWord\Element\Table;
use PhpOffice\PhpWord\IOFactory;

class GradeDocxParser implements GradeParserInterface
{
    private const DIAS_HEADER_SLUG = [
        'SEGUNDA' => 'segunda',
        'TERCA' => 'terca',
        'QUARTA' => 'quarta',
        'QUINTA' => 'quinta',
        'SEXTA' => 'sexta',
        'SABADO' => 'sabado',
    ];

    private const PERIODOS_ORDEM = ['manha', 'tarde', 'noite'];

    public function parse(string $caminhoArquivo): array
    {
        $phpWord = IOFactory::load($caminhoArquivo, 'Word2007');
        $tabelas = $this->listarTabelas($phpWord);
        $celulas = $this->todasCelulas($tabelas);

        return [
            'professor' => $this->extrairProfessor($celulas),
            'grade' => $this->extrairDadosGrade($celulas),
            'componentes' => $this->extrairComponentesCurriculares($celulas),
            'aulas' => $this->extrairAulas($celulas),
        ];
    }

    /**
     * @return Table[]
     */
    private function listarTabelas($phpWord): array
    {
        $tabelas = [];
        foreach ($phpWord->getSections() as $secao) {
            foreach ($secao->getElements() as $elemento) {
                if ($elemento instanceof Table) {
                    $tabelas[] = $elemento;
                }
            }
        }

        return $tabelas;
    }

    private function textoDoElemento($elemento): string
    {
        if (method_exists($elemento, 'getText')) {
            $texto = $elemento->getText();
            if (is_string($texto)) {
                return $texto;
            }
        }

        if ($elemento instanceof AbstractContainer || method_exists($elemento, 'getElements')) {
            $partes = [];
            foreach ($elemento->getElements() as $sub) {
                $partes[] = $this->textoDoElemento($sub);
            }

            return implode('', $partes);
        }

        return '';
    }

    private function textoDaCelula(Cell $celula): string
    {
        $linhas = [];
        foreach ($celula->getElements() as $elemento) {
            $linhas[] = trim($this->textoDoElemento($elemento));
        }

        return trim(implode("\n", array_filter($linhas, fn ($l) => $l !== '')));
    }

    private function todasCelulas(array $tabelas): array
    {
        $resultado = [];
        foreach ($tabelas as $indiceTabela => $tabela) {
            foreach ($tabela->getRows() as $indiceLinha => $linha) {
                foreach ($linha->getCells() as $indiceColuna => $celula) {
                    $resultado[] = [
                        'tabela' => $indiceTabela,
                        'linha' => $indiceLinha,
                        'coluna' => $indiceColuna,
                        'texto' => $this->textoDaCelula($celula),
                    ];
                }
            }
        }

        return $resultado;
    }

    // ------------------------------------------------------------------
    // Cabeçalho (professor + validade da grade)
    // ------------------------------------------------------------------

    private function valorAoLadoDoRotulo(array $celulas, string $rotulo): ?string
    {
        foreach ($celulas as $celula) {
            if ($this->comparar($celula['texto'], $rotulo)) {
                $proxima = $this->celulaEm($celulas, $celula['tabela'], $celula['linha'], $celula['coluna'] + 1);

                return $proxima !== null ? trim($proxima['texto']) : null;
            }
        }

        return null;
    }

    private function celulaEm(array $celulas, int $tabela, int $linha, int $coluna): ?array
    {
        foreach ($celulas as $celula) {
            if ($celula['tabela'] === $tabela && $celula['linha'] === $linha && $celula['coluna'] === $coluna) {
                return $celula;
            }
        }

        return null;
    }

    private function comparar(string $texto, string $esperado): bool
    {
        return mb_strtoupper(trim($texto)) === mb_strtoupper($esperado);
    }

    private function semAcento(string $texto): string
    {
        $semCombinantes = preg_replace('/[\x{0300}-\x{036F}]/u', '', $texto);
        $mapa = [
            'Á' => 'A', 'À' => 'A', 'Â' => 'A', 'Ã' => 'A', 'Ä' => 'A',
            'É' => 'E', 'È' => 'E', 'Ê' => 'E', 'Ë' => 'E',
            'Í' => 'I', 'Ì' => 'I', 'Î' => 'I', 'Ï' => 'I',
            'Ó' => 'O', 'Ò' => 'O', 'Ô' => 'O', 'Õ' => 'O', 'Ö' => 'O',
            'Ú' => 'U', 'Ù' => 'U', 'Û' => 'U', 'Ü' => 'U',
            'Ç' => 'C',
        ];

        return trim(strtr(mb_strtoupper($semCombinantes), $mapa));
    }

    private function extrairProfessor(array $celulas): array
    {
        return [
            'nome' => $this->valorAoLadoDoRotulo($celulas, 'NOME'),
            'matricula' => $this->valorAoLadoDoRotulo($celulas, 'Matrícula'),
            'cpf' => $this->valorAoLadoDoRotulo($celulas, 'CPF'),
            'contrato' => $this->valorAoLadoDoRotulo($celulas, 'Contrato'),
        ];
    }

    private function extrairDadosGrade(array $celulas): array
    {
        return [
            'semestre' => $this->valorAoLadoDoRotulo($celulas, 'SEMESTRE'),
            'validade_inicio' => $this->valorAoLadoDoRotulo($celulas, 'Validade Início'),
            'validade_fim' => $this->valorAoLadoDoRotulo($celulas, 'Validade Fim'),
        ];
    }

    // ------------------------------------------------------------------
    // Tabela "Horas Aulas" (disciplina/curso/período/status/qtde)
    // ------------------------------------------------------------------

    private function extrairComponentesCurriculares(array $celulas): array
    {
        // Acha a linha de cabeçalho da tabela "Horas Aulas" pelo texto da
        // primeira célula ("Disciplina/Projeto").
        $cabecalho = null;
        foreach ($celulas as $celula) {
            if ($celula['coluna'] === 0 && $this->comparar($celula['texto'], 'Disciplina/Projeto')) {
                $cabecalho = $celula;
                break;
            }
        }

        if ($cabecalho === null) {
            return [];
        }

        $linhasDaTabela = array_filter($celulas, fn ($c) => $c['tabela'] === $cabecalho['tabela'] && $c['linha'] > $cabecalho['linha']);

        $porLinha = [];
        foreach ($linhasDaTabela as $c) {
            $porLinha[$c['linha']][$c['coluna']] = $c['texto'];
        }

        $componentes = [];
        foreach ($porLinha as $colunas) {
            if (($colunas[0] ?? '') === '') {
                continue;
            }

            $componentes[] = [
                'disciplina' => trim($colunas[0] ?? ''),
                'curso' => trim($colunas[1] ?? '') ?: null,
                'periodo' => $this->normalizarPeriodo($colunas[2] ?? ''),
                'status' => trim($colunas[3] ?? '') ?: null,
                'quantidade_aulas' => (int) ($colunas[4] ?? 0),
            ];
        }

        return $componentes;
    }

    private function normalizarPeriodo(string $periodo): string
    {
        $p = mb_strtolower(trim($periodo));

        return match (true) {
            str_starts_with($p, 'manh') => 'manha',
            str_starts_with($p, 'tard') => 'tarde',
            default => 'noite',
        };
    }

    // ------------------------------------------------------------------
    // Tabela(s) "GRADE HORÁRIA"
    // ------------------------------------------------------------------

    private function localizarCabecalhosDeDias(array $celulas): array
    {
        $porLinha = [];
        foreach ($celulas as $c) {
            $chave = $c['tabela'] . ':' . $c['linha'];
            $slug = self::DIAS_HEADER_SLUG[$this->semAcento($c['texto'])] ?? null;
            if ($slug !== null) {
                $porLinha[$chave]['tabela'] = $c['tabela'];
                $porLinha[$chave]['linha'] = $c['linha'];
                $porLinha[$chave]['dias'][$slug] = $c['coluna'];
            }
        }

        $cabecalhos = array_values(array_filter($porLinha, fn ($l) => count($l['dias'] ?? []) === 6));

        usort($cabecalhos, fn ($a, $b) => [$a['tabela'], $a['linha']] <=> [$b['tabela'], $b['linha']]);

        return $cabecalhos;
    }

    private function extrairAulas(array $celulas): array
    {
        $cabecalhos = $this->localizarCabecalhosDeDias($celulas);
        if (count($cabecalhos) === 0) {
            return [];
        }

        $aulas = [];

        foreach ($cabecalhos as $indiceBloco => $cabecalho) {
            $periodo = self::PERIODOS_ORDEM[$indiceBloco] ?? 'noite';

            $proximoCabecalhoMesmaTabela = null;
            foreach ($cabecalhos as $outro) {
                if ($outro['tabela'] === $cabecalho['tabela'] && $outro['linha'] > $cabecalho['linha']) {
                    $proximoCabecalhoMesmaTabela = $outro['linha'];
                    break;
                }
            }

            foreach ($cabecalho['dias'] as $diaSlug => $coluna) {
                $celulasDaColuna = array_filter($celulas, function ($c) use ($cabecalho, $coluna, $proximoCabecalhoMesmaTabela) {
                    if ($c['tabela'] !== $cabecalho['tabela'] || $c['coluna'] !== $coluna) {
                        return false;
                    }
                    if ($c['linha'] <= $cabecalho['linha']) {
                        return false;
                    }

                    return $proximoCabecalhoMesmaTabela === null || $c['linha'] < $proximoCabecalhoMesmaTabela;
                });

                foreach ($celulasDaColuna as $c) {
                    $aulas = array_merge($aulas, $this->interpretarCelulaDeAula($c['texto'], $diaSlug, $periodo));
                }
            }
        }

        return $aulas;
    }

    private function interpretarCelulaDeAula(string $textoCelula, string $diaSlug, string $periodo): array
    {
        if (trim($textoCelula) === '') {
            return [];
        }

        $linhas = preg_split('/\R/u', $textoCelula);
        $aulas = [];
        $codigoOpAtual = null;
        $horarioAtual = null;

        foreach ($linhas as $linha) {
            $linha = trim($linha);

            if (preg_match('/^(\d{2}:\d{2})\s*\|\s*(\d{2}:\d{2})$/', $linha, $m)) {
                $horarioAtual = ['hora_inicio' => $m[1], 'hora_fim' => $m[2]];
                continue;
            }

            if (preg_match('/^OP:\s*(\S+)/ui', $linha, $m)) {
                $codigoOpAtual = $m[1];
                continue;
            }

            // Ignora linhas que são só número (matrícula) ou vazias.
            if ($linha === '' || preg_match('/^\d+$/', $linha)) {
                continue;
            }

            // Qualquer outra linha não vazia, depois de já ter visto um
            // horário, é o nome da disciplina — fecha uma aula.
            if ($horarioAtual !== null) {
                $aulas[] = [
                    'disciplina' => $linha,
                    'dia_semana' => $diaSlug,
                    'periodo' => $periodo,
                    'hora_inicio' => $horarioAtual['hora_inicio'],
                    'hora_fim' => $horarioAtual['hora_fim'],
                    'codigo_op' => $codigoOpAtual,
                ];
                $horarioAtual = null;
                $codigoOpAtual = null;
            }
        }

        return $aulas;
    }
}