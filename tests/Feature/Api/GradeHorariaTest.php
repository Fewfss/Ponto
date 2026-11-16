<?php

namespace Tests\Feature\Api;

use App\Models\ComponenteCurricular;
use App\Models\GradeHoraria;
use App\Models\Professor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GradeHorariaTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_searches_and_filters_grades_and_returns_all_filter_options(): void
    {
        $professor = Professor::create([
            'nome' => 'Ana Souza',
            'matricula' => '12345',
            'cpf' => '123.456.789-00',
        ]);

        $grade = GradeHoraria::create([
            'professor_id' => $professor->id,
            'semestre' => '1º/2026',
            'validade_inicio' => '2026-01-01',
            'validade_fim' => '2026-06-30',
        ]);

        ComponenteCurricular::create([
            'grade_horaria_id' => $grade->id,
            'disciplina' => 'Banco de Dados',
            'curso' => 'Sistemas',
            'periodo' => 'noite',
            'status' => 'Ministrando',
        ]);

        $outraGrade = GradeHoraria::create([
            'professor_id' => $professor->id,
            'semestre' => '2º/2026',
            'validade_inicio' => '2026-07-01',
            'validade_fim' => '2026-12-31',
        ]);

        ComponenteCurricular::create([
            'grade_horaria_id' => $outraGrade->id,
            'disciplina' => 'Redes',
            'curso' => 'Redes',
            'periodo' => 'manha',
            'status' => 'Atribuída',
        ]);

        $this->getJson('/api/grades-horarias?q=Banco&inicio=2026-03-01&fim=2026-03-31&semestre=1%C2%BA%2F2026&curso=Sistemas&periodo=Noite&status=Ministrando')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $grade->id)
            ->assertJsonPath('opcoes.periodos.0', 'Manhã')
            ->assertJsonPath('opcoes.periodos.1', 'Noite')
            ->assertJsonPath('opcoes.statuses.0', 'Atribuída')
            ->assertJsonPath('opcoes.statuses.1', 'Ministrando')
            ->assertJsonPath('opcoes.cursos.0', 'Redes')
            ->assertJsonPath('opcoes.cursos.1', 'Sistemas');
    }

    public function test_date_filters_include_grades_with_unbounded_validity(): void
    {
        $professor = Professor::create([
            'nome' => 'Bruno Lima',
            'matricula' => '67890',
        ]);

        $grade = GradeHoraria::create([
            'professor_id' => $professor->id,
            'semestre' => 'Atual',
            'validade_inicio' => null,
            'validade_fim' => null,
        ]);

        $this->getJson('/api/grades-horarias?inicio=2026-01-01&fim=2026-12-31')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $grade->id);
    }

    public function test_it_filters_grades_by_professor_regime_and_returns_regime_options(): void
    {
        $efetivo = Professor::create([
            'nome' => 'Ana Souza',
            'matricula' => '12345',
            'regime_juridico' => 'Efetivo',
        ]);
        $substituto = Professor::create([
            'nome' => 'Bruno Lima',
            'matricula' => '67890',
            'regime_juridico' => 'Substituto',
        ]);

        $gradeEfetivo = GradeHoraria::create(['professor_id' => $efetivo->id]);
        GradeHoraria::create(['professor_id' => $substituto->id]);

        $this->getJson('/api/grades-horarias?regime=Efetivo')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $gradeEfetivo->id)
            ->assertJsonPath('opcoes.regimes.0', 'Efetivo')
            ->assertJsonPath('opcoes.regimes.1', 'Substituto');
    }
}
