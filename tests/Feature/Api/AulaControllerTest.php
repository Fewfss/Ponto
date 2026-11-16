<?php

namespace Tests\Feature\Api;

use App\Models\Aula;
use App\Models\ComponenteCurricular;
use App\Models\GradeHoraria;
use App\Models\Professor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AulaControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_payload_creates_a_class_with_a_default_order(): void
    {
        $grade = $this->createGrade('12345');
        $componente = $this->createComponent($grade);

        $this->postJson('/api/aulas', [
            'grade_horaria_id' => $grade->id,
            'componente_curricular_id' => $componente->id,
            'dia_semana' => 'segunda',
            'periodo' => 'manha',
            'hora_inicio' => '08:00',
            'hora_fim' => '09:00',
            'codigo_op' => '101',
        ])
            ->assertCreated()
            ->assertJsonPath('ordem_horario', 0)
            ->assertJsonPath('componente_curricular_id', $componente->id);

        $this->assertDatabaseHas('aulas', [
            'grade_horaria_id' => $grade->id,
            'componente_curricular_id' => $componente->id,
            'ordem_horario' => 0,
            'hora_inicio' => '08:00',
        ]);
    }

    public function test_it_rejects_a_component_from_another_grade_when_creating_a_class(): void
    {
        $grade = $this->createGrade('12345');
        $outraGrade = $this->createGrade('67890');
        $componente = $this->createComponent($outraGrade);

        $this->postJson('/api/aulas', [
            'grade_horaria_id' => $grade->id,
            'componente_curricular_id' => $componente->id,
            'dia_semana' => 'segunda',
            'periodo' => 'manha',
            'hora_inicio' => '08:00',
            'hora_fim' => '09:00',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('componente_curricular_id');

        $this->assertDatabaseCount('aulas', 0);
    }

    public function test_it_rejects_a_component_from_another_grade_when_updating_a_class(): void
    {
        $grade = $this->createGrade('12345');
        $outraGrade = $this->createGrade('67890');
        $componente = $this->createComponent($grade);
        $componenteDeOutraGrade = $this->createComponent($outraGrade);
        $aula = Aula::create([
            'grade_horaria_id' => $grade->id,
            'componente_curricular_id' => $componente->id,
            'dia_semana' => 'segunda',
            'periodo' => 'manha',
            'ordem_horario' => 0,
            'hora_inicio' => '08:00',
            'hora_fim' => '09:00',
        ]);

        $this->patchJson("/api/aulas/{$aula->id}", [
            'componente_curricular_id' => $componenteDeOutraGrade->id,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('componente_curricular_id');

        $this->assertDatabaseHas('aulas', [
            'id' => $aula->id,
            'componente_curricular_id' => $componente->id,
        ]);
    }

    public function test_deleting_a_class_removes_it(): void
    {
        $grade = $this->createGrade('12345');
        $componente = $this->createComponent($grade);
        $aula = Aula::create([
            'grade_horaria_id' => $grade->id,
            'componente_curricular_id' => $componente->id,
            'dia_semana' => 'segunda',
            'periodo' => 'manha',
            'ordem_horario' => 0,
            'hora_inicio' => '08:00',
            'hora_fim' => '09:00',
        ]);

        $this->deleteJson("/api/aulas/{$aula->id}")
            ->assertNoContent();

        $this->assertModelMissing($aula);
    }

    private function createGrade(string $matricula): GradeHoraria
    {
        $professor = Professor::create([
            'nome' => 'Ana Souza',
            'matricula' => $matricula,
        ]);

        return GradeHoraria::create(['professor_id' => $professor->id]);
    }

    private function createComponent(GradeHoraria $grade): ComponenteCurricular
    {
        return ComponenteCurricular::create([
            'grade_horaria_id' => $grade->id,
            'disciplina' => 'Banco de Dados',
            'periodo' => 'manha',
            'quantidade_aulas' => 2,
        ]);
    }
}
