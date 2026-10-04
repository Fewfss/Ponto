<?php

namespace App\Services\GradeImport;

use App\Models\Aula;
use App\Models\ComponenteCurricular;
use App\Models\GradeHoraria;
use App\Models\Professor;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class GradeImportService
{
    /**
     * @param array $dados resultado de GradeParserInterface::parse() —
     *              mesmo formato independente de ter vindo de PDF ou DOCX.
     * @param string $caminhoArquivoArmazenado caminho (relativo ao disco do
     *               Storage) do arquivo original enviado, só para registro.
     */
    public function importar(array $dados, string $caminhoArquivoArmazenado): GradeHoraria
    {
        return DB::transaction(function () use ($dados, $caminhoArquivoArmazenado) {
            $professor = Professor::updateOrCreate(
                ['matricula' => $dados['professor']['matricula']],
                [
                    'nome' => $this->normalizarNomeProprio($dados['professor']['nome'] ?? ''),
                    'cpf' => $dados['professor']['cpf'],
                    'regime_juridico' => $dados['professor']['contrato'],
                ]
            );

            $grade = GradeHoraria::create([
                'professor_id' => $professor->id,
                'semestre' => $dados['grade']['semestre'],
                'validade_inicio' => $this->paraData($dados['grade']['validade_inicio']),
                'validade_fim' => $this->paraData($dados['grade']['validade_fim']),
                'hora_aula_semanal' => array_sum(array_column($dados['componentes'], 'quantidade_aulas')),
                'arquivo_original' => $caminhoArquivoArmazenado,
                'dados_brutos' => $dados,
            ]);

            $componentesPorNome = [];
            foreach ($dados['componentes'] as $dadosComponente) {
                $componente = ComponenteCurricular::create([
                    'grade_horaria_id' => $grade->id,
                    ...$dadosComponente,
                ]);

                $componentesPorNome[$this->normalizarNomeDisciplina($componente->disciplina)] = $componente;
            }

            foreach ($dados['aulas'] as $dadosAula) {
                $componente = $componentesPorNome[$this->normalizarNomeDisciplina($dadosAula['disciplina'])] ?? null;

                if ($componente === null) {
                    // Não foi possível casar a aula com uma disciplina conhecida
                    // da tabela "Horas Aulas" — melhor não gravar do que gravar
                    // errado (spec: "não inventar valores").
                    continue;
                }

                Aula::create([
                    'grade_horaria_id' => $grade->id,
                    'componente_curricular_id' => $componente->id,
                    'dia_semana' => $dadosAula['dia_semana'],
                    'periodo' => $dadosAula['periodo'],
                    'ordem_horario' => 0, // recalculado sob demanda pelo FolhaPontoGenerator
                    'hora_inicio' => $dadosAula['hora_inicio'],
                    'hora_fim' => $dadosAula['hora_fim'],
                    'codigo_op' => $dadosAula['codigo_op'],
                ]);
            }

            return $grade->fresh(['professor', 'componentesCurriculares', 'aulas']);
        });
    }

    private function paraData(?string $dataBr): ?Carbon
    {
        return $dataBr ? Carbon::createFromFormat('d/m/Y', $dataBr) : null;
    }

    private function normalizarNomeProprio(string $nome): string
    {
        $conectivos = ['de', 'da', 'do', 'das', 'dos', 'e'];
        $palavras = preg_split('/\s+/u', mb_strtolower(trim($nome), 'UTF-8'));

        $resultado = array_map(function ($palavra, $indice) use ($conectivos) {
            if ($indice > 0 && in_array($palavra, $conectivos, true)) {
                return $palavra;
            }

            return mb_convert_case($palavra, MB_CASE_TITLE, 'UTF-8');
        }, $palavras, array_keys($palavras));

        return implode(' ', $resultado);
    }

    private function normalizarNomeDisciplina(string $nome): string
    {
        $semSufixo = preg_replace('/\s*\(.*?\)\s*$/u', '', $nome);

        return mb_strtoupper(trim($semSufixo));
    }
}