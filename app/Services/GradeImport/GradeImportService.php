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
    public function __construct(
        private readonly GradePdfParser $parser,
    ) {
    }

    public function importar(string $caminhoPdfArmazenado, string $caminhoPdfAbsoluto): GradeHoraria
    {
        $dados = $this->parser->parse($caminhoPdfAbsoluto);

        return DB::transaction(function () use ($dados, $caminhoPdfArmazenado) {
            $professor = Professor::updateOrCreate(
                ['matricula' => $dados['professor']['matricula']],
                [
                    'nome' => $dados['professor']['nome'],
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
                'arquivo_original' => $caminhoPdfArmazenado,
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
                    
                    continue;
                }

                Aula::create([
                    'grade_horaria_id' => $grade->id,
                    'componente_curricular_id' => $componente->id,
                    'dia_semana' => $dadosAula['dia_semana'],
                    'periodo' => $dadosAula['periodo'],
                    'ordem_horario' => 0,
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

    private function normalizarNomeDisciplina(string $nome): string
    {
        $semSufixo = preg_replace('/\s*\(.*?\)\s*$/u', '', $nome);

        return mb_strtoupper(trim($semSufixo));
    }
}