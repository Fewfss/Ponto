<?php

namespace App\Services\FolhaPonto;

use App\Models\FolhaPonto;
use App\Models\GradeHoraria;
use App\Models\Professor;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\Settings;
use PhpOffice\PhpWord\TemplateProcessor;
use RuntimeException;
use ZipArchive;

class FolhaPontoGenerator
{
    private const TEMPLATE_PATH = 'templates/folha_ponto_modelo.docx';

    private const PARES_POR_PERIODO = [
        'manha' => 3,
        'tarde' => 3,
        'noite' => 2,
    ];

    // Horário de início de cada "par" de aulas (colunas mescladas da tabela GRADE HORÁRIA do
    // modelo, conforme o cabeçalho 1º/2º, 3º/4º, 5º/6º). Uma aula cai no último par cujo início
    // é <= ao início dela — assim 09:50 e 10:40 vão para o 2º par mesmo que o 1º par esteja vazio.
    private const INICIO_DOS_PARES = [
        'manha' => ['07:30', '09:20', '11:10'],
        'tarde' => ['13:00', '14:50', '16:40'],
        'noite' => ['19:20', '21:10'],
    ];

    private const ORDEM_DIAS_TABELA = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

    public function __construct(
        private readonly DocxToPdfConverter $conversorPdf,
    ) {
    }

    /**
     * @param array<int, string> $feriadosExtras datas "YYYY-MM-DD" a tratar como feriado além dos
     *        já conhecidos (ex.: Carnaval, recesso da faculdade) — ficam cinza na frequência.
     */
    public function gerar(Professor $professor, GradeHoraria $grade, int $mes, int $ano, array $feriadosExtras = []): FolhaPonto
    {
        $caminhoTemplate = Storage::path(self::TEMPLATE_PATH);

        if (! is_file($caminhoTemplate)) {
            throw new RuntimeException(
                'Modelo da folha de ponto não encontrado. Coloque o arquivo em: ' . $caminhoTemplate
            );
        }

        // Os valores vêm de campos digitados (ex.: HAE, categoria): escapa &, < e > no XML.
        Settings::setOutputEscapingEnabled(true);

        $arquivoTemp = tempnam(sys_get_temp_dir(), 'folha_') . '.docx';

        $processor = new TemplateProcessor($caminhoTemplate);
        $processor->setValue('professor_nome', $professor->nome ?? '');
        $processor->setValue('matricula', $professor->matricula ?? '');
        $processor->setValue('regime_juridico', $professor->regime_juridico ?? '');
        $processor->setValue('categoria', $professor->categoria ?? '');
        $processor->setValue('hora_aula_semanal', (string) ($grade->hora_aula_semanal ?? ''));
        $processor->setValue('hora_atividade', (string) ($grade->hora_atividade ?? ''));
        $processor->setValue('hae_projeto', (string) ($grade->hae_projeto ?? ''));
        $processor->setValue('hae_coordenacao', (string) ($grade->hae_coordenacao ?? ''));
        $processor->setValue('mes_ano', CalendarioMensal::nomeMesAno($mes, $ano));
        $processor->saveAs($arquivoTemp);

        $documentXml = $this->lerDocumentXmlDoZip($arquivoTemp);

        $editor = new DocxTableEditor($documentXml);
        $this->preencherGradeHoraria($editor, $grade);
        $this->atualizarCalendarioMensal($editor, $mes, $ano, AgendaSemanal::deAulas($grade->aulas), Feriados::doMes($mes, $ano, $feriadosExtras));

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
                'arquivo_gerado_pdf' => null,
                'status' => 'gerada',
            ]
        );
    }

    public function converterParaPdf(FolhaPonto $folha): FolhaPonto
    {
        $caminhoDocxAbsoluto = Storage::path($folha->arquivo_gerado);

        $pastaTemp = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'folha_pdf_' . uniqid();
        mkdir($pastaTemp);

        $copiaTemp = $pastaTemp . DIRECTORY_SEPARATOR . basename($caminhoDocxAbsoluto);
        copy($caminhoDocxAbsoluto, $copiaTemp);

        $caminhoPdfGerado = $this->conversorPdf->converter($copiaTemp);

        $nomeArquivoPdf = preg_replace('/\.docx$/i', '.pdf', $folha->arquivo_gerado);
        Storage::put($nomeArquivoPdf, file_get_contents($caminhoPdfGerado));

        @unlink($copiaTemp);
        @unlink($caminhoPdfGerado);
        @rmdir($pastaTemp);

        $folha->update(['arquivo_gerado_pdf' => $nomeArquivoPdf]);

        return $folha->fresh();
    }

    private function preencherGradeHoraria(DocxTableEditor $editor, GradeHoraria $grade): void
    {
        $tabela = $editor->localizarTabelaPorTextosNaPrimeiraLinha(['MANHÃ', 'TARDE', 'NOITE']);
        $linhas = $editor->linhas($tabela);

        $linhasPorDia = array_combine(self::ORDEM_DIAS_TABELA, array_slice($linhas, 3, 6));

        foreach ($grade->aulas as $aula) {
            $linha = $linhasPorDia[$aula->dia_semana] ?? null;
            if ($linha === null) {
                continue; // domingo não existe na tabela de grade horária do modelo
            }

            if (! isset(self::INICIO_DOS_PARES[$aula->periodo])) {
                continue;
            }

            $indiceDoPar = $this->indiceDoPar($aula->periodo, (string) $aula->hora_inicio);
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

            if ($textoAtual === '') {
                $nomeAbreviado = $this->abreviarDisciplina($aula->componenteCurricular->disciplina ?? '');
                $editor->definirTextoDisciplinaNaCelula($celulas[$indiceCelula], $nomeAbreviado);
            }
        }
    }

    private function abreviarDisciplina(string $nome): string
    {
        // Remove o que vem entre parênteses, ex.: "ESPANHOL I (Determinada)" -> "ESPANHOL I"
        $nome = preg_replace('/\s*\([^)]*\)/u', '', $nome) ?? $nome;

        $palavras = preg_split('/\s+/u', trim($nome));
        $partes = [];

        foreach ($palavras as $palavra) {
            if ($palavra === '') {
                continue;
            }

            if (preg_match('/^[IVXLCDM]+$/i', $palavra)) {
                $partes[] = mb_strtoupper($palavra) . '.';
            } else {
                $partes[] = mb_strtoupper(mb_substr($palavra, 0, 1)) . '.';
            }
        }

        return implode(' ', $partes);
    }

    private function indiceDoPar(string $periodo, string $horaInicio): int
    {
        $hhmm = substr($horaInicio, 0, 5); // "09:50:00" -> "09:50" (comparação de strings HH:MM funciona)
        $indice = 0;

        foreach (self::INICIO_DOS_PARES[$periodo] as $i => $inicioDoPar) {
            if ($hhmm >= $inicioDoPar) {
                $indice = $i;
            }
        }

        return $indice;
    }

    /**
     * @param array<int, string> $feriados dia do mês => nome do feriado
     */
    private function atualizarCalendarioMensal(
        DocxTableEditor $editor,
        int $mes,
        int $ano,
        AgendaSemanal $agenda,
        array $feriados = [],
    ): void {
        $tabela = $editor->localizarTabelaPorInicioDaPrimeiraLinha('Dia');
        $linhas = $editor->linhas($tabela);

        $dias = CalendarioMensal::diasDoMes($mes, $ano);
        $totalDiasDoMes = count($dias);

        $linhasDeDias = array_slice($linhas, 2, 31);

        foreach ($linhasDeDias as $indice => $linha) {
            $numeroDoDia = $indice + 1;
            $celulas = $editor->celulas($linha);

            if ($numeroDoDia > $totalDiasDoMes) {
                $editor->removerLinha($linha);
                continue;
            }

            if (isset($celulas[1])) {
                $editor->definirTextoDaCelula($celulas[1], $dias[$indice]['dia_semana']);
            }

            $slug = $dias[$indice]['dia_semana_slug'];
            $feriado = isset($feriados[$numeroDoDia]);

            // Cinza = "aqui não se assina": domingos, feriados, dias sem aula e as aulas que o
            // professor não dá. Se a linha não tiver o layout esperado do modelo (21 células),
            // não dá pra apontar a coluna de cada aula, então só marcamos domingo/feriado.
            if (count($celulas) === SombreadoFrequencia::TOTAL_DE_CELULAS) {
                $editor->definirSombreadoCelulas($linha, SombreadoFrequencia::celulasCinzas($slug, $feriado, $agenda));
            } else {
                $editor->definirSombreadoLinha($linha, $slug === 'domingo' || $feriado);
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
