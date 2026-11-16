<?php

namespace Tests\Feature\Api;

use App\Models\Aula;
use App\Models\ComponenteCurricular;
use App\Models\GradeHoraria;
use App\Models\Professor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ComponenteCurricularControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_payload_creates_a_component_for_a_grade(): void
    {
        $grade = $this->createGrade('12345');

        $this->postJson('/api/componentes-curriculares', [
            'grade_horaria_id' => $grade->id,
            'disciplina' => 'Banco de Dados',
            'curso' => 'Sistemas',
            'periodo' => 'noite',
            'status' => 'Ministrando',
            'quantidade_aulas' => 4,
        ])
            ->assertCreated()
            ->assertJsonPath('grade_horaria_id', $grade->id)
            ->assertJsonPath('disciplina', 'Banco de Dados');

        $this->assertDatabaseHas('componentes_curriculares', [
            'grade_horaria_id' => $grade->id,
            'disciplina' => 'Banco de Dados',
        ]);
    }

    public function test_valid_patch_updates_a_component(): void
    {
        $grade = $this->createGrade('12345');
        $componente = ComponenteCurricular::create([
            'grade_horaria_id' => $grade->id,
            'disciplina' => 'Banco de Dados',
            'periodo' => 'noite',
            'quantidade_aulas' => 2,
        ]);

        $this->patchJson("/api/componentes-curriculares/{$componente->id}", [
            'disciplina' => 'Banco de Dados Avançado',
        ])
            ->assertOk()
            ->assertJsonPath('id', $componente->id)
            ->assertJsonPath('disciplina', 'Banco de Dados Avançado');

        $this->assertDatabaseHas('componentes_curriculares', [
            'id' => $componente->id,
            'disciplina' => 'Banco de Dados Avançado',
        ]);
    }

    public function test_deleting_a_component_also_deletes_its_classes(): void
    {
        $grade = $this->createGrade('12345');
        $componente = ComponenteCurricular::create([
            'grade_horaria_id' => $grade->id,
            'disciplina' => 'Banco de Dados',
            'periodo' => 'noite',
            'quantidade_aulas' => 2,
        ]);
        $aula = Aula::create([
            'grade_horaria_id' => $grade->id,
            'componente_curricular_id' => $componente->id,
            'dia_semana' => 'segunda',
            'periodo' => 'noite',
            'ordem_horario' => 0,
            'hora_inicio' => '19:20',
            'hora_fim' => '20:10',
        ]);

        $this->deleteJson("/api/componentes-curriculares/{$componente->id}")
            ->assertNoContent();

        $this->assertModelMissing($componente);
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
}
