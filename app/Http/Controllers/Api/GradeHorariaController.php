<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ComponenteCurricular;
use App\Models\GradeHoraria;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GradeHorariaController extends Controller
{
    /**
     * GET /api/grades-horarias
     *
     * Lista grades importadas (mais recentes primeiro), já com
     * professor, componentes curriculares e aulas — o suficiente para a
     * tela de Grade montar cards, filtros e o documento da grade.
     * Aceita busca textual, filtros de componente e intervalo de vigência.
     * `dados_brutos` (payload cru do parser) fica de fora: é grande e só
     * serve para auditoria.
     */
    public function index(Request $request)
    {
        $filtros = $request->validate([
            'q' => ['sometimes', 'nullable', 'string', 'max:200'],
            'inicio' => ['sometimes', 'nullable', 'date'],
            'fim' => ['sometimes', 'nullable', 'date', 'after_or_equal:inicio'],
            'semestre' => ['sometimes', 'nullable', 'string', 'max:50'],
            'curso' => ['sometimes', 'nullable', 'string', 'max:255'],
            'periodo' => ['sometimes', 'nullable', Rule::in(['Manhã', 'Tarde', 'Noite'])],
            'status' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        $query = GradeHoraria::query()
            ->with(['professor', 'componentesCurriculares', 'aulas.componenteCurricular'])
            ->orderByDesc('validade_inicio')
            ->orderByDesc('id');

        if (! empty($filtros['q'])) {
            $termo = '%'.mb_strtolower($filtros['q']).'%';
            $query->where(function ($query) use ($termo) {
                $query->whereHas('professor', function ($query) use ($termo) {
                    $query->whereRaw('LOWER(nome) LIKE ?', [$termo])
                        ->orWhereRaw('LOWER(matricula) LIKE ?', [$termo])
                        ->orWhereRaw('LOWER(cpf) LIKE ?', [$termo])
                        ->orWhereRaw('LOWER(regime_juridico) LIKE ?', [$termo])
                        ->orWhereRaw('LOWER(categoria) LIKE ?', [$termo]);
                })
                    ->orWhereRaw('LOWER(semestre) LIKE ?', [$termo])
                    ->orWhereHas('componentesCurriculares', function ($query) use ($termo) {
                        $query->whereRaw('LOWER(disciplina) LIKE ?', [$termo])
                            ->orWhereRaw('LOWER(curso) LIKE ?', [$termo])
                            ->orWhereRaw('LOWER(periodo) LIKE ?', [$termo])
                            ->orWhereRaw('LOWER(status) LIKE ?', [$termo]);
                    });
            });
        }

        if (! empty($filtros['semestre'])) {
            $query->where('semestre', $filtros['semestre']);
        }

        if (! empty($filtros['inicio'])) {
            $query->where(function ($query) use ($filtros) {
                $query->whereNull('validade_fim')
                    ->orWhereDate('validade_fim', '>=', $filtros['inicio']);
            });
        }

        if (! empty($filtros['fim'])) {
            $query->where(function ($query) use ($filtros) {
                $query->whereNull('validade_inicio')
                    ->orWhereDate('validade_inicio', '<=', $filtros['fim']);
            });
        }

        foreach (['curso', 'periodo', 'status'] as $campo) {
            if (empty($filtros[$campo])) {
                continue;
            }

            $valor = $campo === 'periodo'
                ? ['Manhã' => 'manha', 'Tarde' => 'tarde', 'Noite' => 'noite'][$filtros[$campo]]
                : $filtros[$campo];

            $query->whereHas('componentesCurriculares', function ($query) use ($campo, $valor) {
                $query->where($campo, $valor);
            });
        }

        $periodos = ComponenteCurricular::query()
            ->select('periodo')
            ->distinct()
            ->orderBy('periodo')
            ->pluck('periodo')
            ->map(fn (string $periodo) => ['manha' => 'Manhã', 'tarde' => 'Tarde', 'noite' => 'Noite'][$periodo])
            ->values();

        return response()->json([
            'data' => $query->get()->makeHidden('dados_brutos'),
            'opcoes' => [
                'semestres' => GradeHoraria::query()->whereNotNull('semestre')->where('semestre', '<>', '')
                    ->distinct()->orderBy('semestre')->pluck('semestre')->values(),
                'cursos' => ComponenteCurricular::query()->whereNotNull('curso')->where('curso', '<>', '')
                    ->distinct()->orderBy('curso')->pluck('curso')->values(),
                'periodos' => $periodos,
                'statuses' => ComponenteCurricular::query()->whereNotNull('status')->where('status', '<>', '')
                    ->distinct()->orderBy('status')->pluck('status')->values(),
            ],
        ]);
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
