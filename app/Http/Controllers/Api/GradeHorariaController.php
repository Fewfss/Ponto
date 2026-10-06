<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GradeHoraria;
use Illuminate\Http\Request;

class GradeHorariaController extends Controller
{
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
        ]);

        $gradeHoraria->update($validado);

        return $gradeHoraria->fresh(['componentesCurriculares', 'aulas']);
    }
}