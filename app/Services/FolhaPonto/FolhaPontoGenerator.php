<?php

namespace App\Services\FolhaPonto;

use App\Models\FolhaPonto;
use App\Models\GradeHoraria;
use App\Models\Professor;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\TemplateProcessor;
use ZipArchive;

class FolhaPontoGenerator
{
    private const TEMPLATE_PATH = 'templates/folha_ponto_modelo.docx';

    private const PARES_POR_PERIODO = [
        'manha' => 3,
        'tarde' => 3,
        'noite' => 2,
    ];

    private const ORDEM_DIAS_TABELA = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

    public function gerar(Professor $professor, GradeHoraria $grade, int $mes, int $ano): FolhaPonto
    {
        $caminhoTemplate = Storage::path(self::TEMPLATE_PATH);

        $arquivoTemp = tempnam(sys_get_temp_dir(), 'folha_') . '.docx';

        $processor = new TemplateProcessor($caminhoTemplate);
        $processor->setValue('professor_nome', $professor->nome ?? '');
        $processor->setValue('matricula', $professor->matricula ?? '');
        $processor->setValue('regime_juridico', $professor->regime_juridico ?? '');
        $processor->setValue('categoria', $professor->categoria ?? '');
        $processor->setValue('hora_aula_semanal', (string) ($grade->hora_aula_semanal ?? ''));
        $processor->setValue('hora_atividade', '');
        $processor->setValue('hae_projeto', '');
        $processor->setValue('hae_coordenacao', '');
        $processor->setValue('mes_ano', CalendarioMensal::nomeMesAno($mes, $ano));
        $processor->saveAs($arquivoTemp);

        $documentXml = $this->lerDocumentXmlDoZip($arquivoTemp);

        $editor = new DocxTableEditor($documentXml);
        $this->preencherGradeHoraria($editor, $grade);
        $this->atualizarCalendarioMensal($editor, $mes, $ano);

        $this->escreverDocumentXmlNoZip($arquivoTemp, $editor->toXml());

        $nomeArquivo = sprintf(
            'folhas-ponto/%s/%s-%02d-%04d.docx',
            $professor->matricula,
            str($professor->nome)->slug(),
            $mes,
            $ano
        );

        Storage::put($nomeArquivo, file_get_contents($arquivoTemp));
        unlink($arquivoTemp);

        return FolhaPonto::updateOrCreate(
            ['professor_id' => $professor->id, 'mes' => $mes, 'ano' => $ano],
            [
                'grade_horaria_id' => $grade->id,
                'arquivo_gerado' => $nomeArquivo,
                'status' => 'gerada',
            ]
        );
    }

    private function preencherGradeHoraria(DocxTableEditor $editor, GradeHoraria $grade): void
    {
        $tabela = $editor->localizarTabelaPorTextosNaPrimeiraLinha(['MANHÃ', 'TARDE', 'NOITE']);
        $linhas = $editor->linhas($tabela);

        $linhasPorDia = array_combine(self::ORDEM_DIAS_TABELA, array_slice($linhas, 3, 6));

        $ordemHorarioPorPeriodo = $this->calcularOrdemHorarioPorPeriodo($grade);

        foreach ($grade->aulas as $aula) {
            $linha = $linhasPorDia[$aula->dia_semana] ?? null;
            if ($linha === null) {
                continue;
            }

            $ordemHorario = $ordemHorarioPorPeriodo[$aula->periodo][$aula->hora_inicio] ?? null;
            if ($ordemHorario === null) {
                continue;
            }

            $indiceDoPar = intdiv($ordemHorario - 1, 2);
            $celulas = $editor->celulas($linha);

            $offsetPeriodo = match ($aula->periodo) {
                'manha' => 0,
                'tarde' => self::PARES_POR_PERIODO['manha'],
                'noite' => self::PARES_POR_PERIODO['manha'] + self::PARES_POR_PERIODO['tarde'],
            };
            $indiceCelula = 1 + $offsetPeriodo + $indiceDoPar;

            if (! isset($celulas[$indiceCelula])) {
                continue;
            }

            $textoAtual = trim($editor->textoDaCelula($celulas[$indiceCelula]));
            $nomeDisciplina = $aula->componenteCurricular->disciplina ?? '';

            if ($textoAtual === '' ) {
                $editor->definirTextoDaCelula($celulas[$indiceCelula], $nomeDisciplina);
            }
        }
    }

    private function calcularOrdemHorarioPorPeriodo(GradeHoraria $grade): array
    {
        $porPeriodo = [];
        foreach ($grade->aulas as $aula) {
            $porPeriodo[$aula->periodo][$aula->hora_inicio] = true;
        }

        $resultado = [];
        foreach ($porPeriodo as $periodo => $horarios) {
            $ordenados = array_keys($horarios);
            sort($ordenados);

            $resultado[$periodo] = [];
            foreach ($ordenados as $posicaoZeroBased => $hora) {
                $resultado[$periodo][$hora] = $posicaoZeroBased + 1;
            }
        }

        return $resultado;
    }

    private function atualizarCalendarioMensal(DocxTableEditor $editor, int $mes, int $ano): void
    {
        $tabela = $editor->localizarTabelaPorInicioDaPrimeiraLinha('Dia');
        $linhas = $editor->linhas($tabela);

        $dias = CalendarioMensal::diasDoMes($mes, $ano);
        $totalDiasDoMes = count($dias);

        $linhasDeDias = array_slice($linhas, 2, 31);

        foreach ($linhasDeDias as $indice => $linha) {
            $numeroDoDia = $indice + 1;
            $celulas = $editor->celulas($linha);

            if ($numeroDoDia > $totalDiasDoMes) {
                // Dia não existe nesse mês (ex.: 30/31 de fevereiro) — remove a linha.
                $editor->removerLinha($linha);
                continue;
            }

            if (isset($celulas[1])) {
                $editor->definirTextoDaCelula($celulas[1], $dias[$indice]['dia_semana']);
            }
        }
    }

    private function lerDocumentXmlDoZip(string $caminhoDocx): string
    {
        $zip = new ZipArchive();
        $zip->open($caminhoDocx);
        $conteudo = $zip->getFromName('word/document.xml');
        $zip->close();

        return $conteudo;
    }

    private function escreverDocumentXmlNoZip(string $caminhoDocx, string $xml): void
    {
        $zip = new ZipArchive();
        $zip->open($caminhoDocx);
        $zip->addFromString('word/document.xml', $xml);
        $zip->close();
    }
}