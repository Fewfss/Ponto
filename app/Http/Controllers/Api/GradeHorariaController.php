<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GradeHoraria;
use Illuminate\Http\Request;

class GradeHorariaController extends Controller
{
    /**
     * GET /api/grades-horarias
     *
     * Lista todas as grades importadas (mais recentes primeiro), já com
     * professor, componentes curriculares e aulas — o suficiente para a
     * tela de Grade montar cards, filtros e o documento da grade.
     * `dados_brutos` (payload cru do parser) fica de fora: é grande e só
     * serve para auditoria.
     */
    public function index()
    {
        return GradeHoraria::query()
            ->with(['professor', 'componentesCurriculares', 'aulas.componenteCurricular'])
            ->orderByDesc('validade_inicio')
            ->orderByDesc('id')
            ->get()
            ->makeHidden('dados_brutos');
    }

    public function show(GradeHoraria $gradeHoraria)
    {
        return $gradeHoraria->load(['professor', 'componentesCurriculares', 'aulas.componenteCurricular']);
    }

    public function update(Request $request, GradeHoraria $gradeHoraria)
    {
        $validado = $request->validate([
            'semestre' => ['sometimes', 'nullable', 'string', 'max:50'],
            'validade_inicio' => ['sometimes', 'nullable', 'date'],
            'validade_fim' => ['sometimes', 'nullable', 'date', 'after_or_equal:validade_inicio'],
            'hora_aula_semanal' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'hora_atividade' => ['sometimes', 'nullable', 'string', 'max:50'],
            'hae_projeto' => ['sometimes', 'nullable', 'string', 'max:50'],
            'hae_coordenacao' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        $gradeHoraria->update($validado);

        return $gradeHoraria->fresh(['componentesCurriculares', 'aulas']);
    }

    /**
     * DELETE /api/grades-horarias/{gradeHoraria}
     *
     * Remove a grade; componentes e aulas caem junto (cascade no banco) e as
     * folhas de ponto já geradas ficam com grade_horaria_id = null.
     * O professor é mantido.
     */
    public function destroy(GradeHoraria $gradeHoraria)
    {
        $gradeHoraria->delete();

        return response()->noContent();
    }
}
