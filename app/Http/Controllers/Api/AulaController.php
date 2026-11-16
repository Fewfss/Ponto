<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Aula;
use App\Models\ComponenteCurricular;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class AulaController extends Controller
{
    private const DIAS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

    private const PERIODOS = ['manha', 'tarde', 'noite'];

    private const REGRAS_CRIACAO = [
        'grade_horaria_id' => ['required', 'exists:grades_horarias,id'],
        'componente_curricular_id' => ['required', 'exists:componentes_curriculares,id'],
        'dia_semana' => ['required'],
        'periodo' => ['required'],
        'hora_inicio' => ['required', 'date_format:H:i'],
        'hora_fim' => ['required', 'date_format:H:i', 'after:hora_inicio'],
        'codigo_op' => ['nullable', 'string', 'max:50'],
    ];

    private const REGRAS_EDICAO = [
        'grade_horaria_id' => ['sometimes', 'exists:grades_horarias,id'],
        'componente_curricular_id' => ['sometimes', 'required', 'exists:componentes_curriculares,id'],
        'dia_semana' => ['sometimes', 'required'],
        'periodo' => ['sometimes', 'required'],
        'hora_inicio' => ['sometimes', 'required', 'date_format:H:i'],
        'hora_fim' => ['sometimes', 'required', 'date_format:H:i'],
        'codigo_op' => ['sometimes', 'nullable', 'string', 'max:50'],
    ];

    public function index(Request $request): EloquentCollection
    {
        $query = Aula::query()->with('componenteCurricular');

        if ($request->filled('grade_horaria_id')) {
            $query->where('grade_horaria_id', $request->integer('grade_horaria_id'));
        }

        return $query->orderBy('dia_semana')->orderBy('hora_inicio')->get();
    }

    public function store(Request $request): Aula
    {
        $validado = $request->validate(array_merge(self::REGRAS_CRIACAO, [
            'dia_semana' => ['required', 'in:'.implode(',', self::DIAS)],
            'periodo' => ['required', 'in:'.implode(',', self::PERIODOS)],
        ]));

        $this->validarComponenteDaGrade($validado['grade_horaria_id'], $validado['componente_curricular_id']);
        $validado['ordem_horario'] = 0;

        return Aula::create($validado)->load('componenteCurricular');
    }

    public function show(Aula $aula): Aula
    {
        return $aula->load('componenteCurricular');
    }

    public function update(Request $request, Aula $aula): Aula
    {
        $regras = self::REGRAS_EDICAO;
        if ($request->has('dia_semana')) {
            $regras['dia_semana'] = ['required', 'in:'.implode(',', self::DIAS)];
        }
        if ($request->has('periodo')) {
            $regras['periodo'] = ['required', 'in:'.implode(',', self::PERIODOS)];
        }
        if ($request->has('hora_fim')) {
            $horaInicio = $request->input('hora_inicio', substr((string) $aula->hora_inicio, 0, 5));
            $regras['hora_fim'][] = 'after:'.$horaInicio;
        }

        $validado = $request->validate($regras);
        $gradeHorariaId = $validado['grade_horaria_id'] ?? $aula->grade_horaria_id;
        $componenteCurricularId = $validado['componente_curricular_id'] ?? $aula->componente_curricular_id;

        $this->validarComponenteDaGrade($gradeHorariaId, $componenteCurricularId);

        $aula->update($validado);

        return $aula->fresh()->load('componenteCurricular');
    }

    public function destroy(Aula $aula): Response
    {
        $aula->delete();

        return response()->noContent();
    }

    private function validarComponenteDaGrade(int $gradeHorariaId, int $componenteCurricularId): void
    {
        $componentePertenceAGrade = ComponenteCurricular::query()
            ->whereKey($componenteCurricularId)
            ->where('grade_horaria_id', $gradeHorariaId)
            ->exists();

        if (! $componentePertenceAGrade) {
            throw ValidationException::withMessages([
                'componente_curricular_id' => 'A disciplina selecionada não pertence à grade informada.',
            ]);
        }
    }
}
