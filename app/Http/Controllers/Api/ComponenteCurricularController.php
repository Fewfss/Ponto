<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ComponenteCurricular;
use App\Models\GradeHoraria;
use Illuminate\Http\Request;

class ComponenteCurricularController extends Controller
{
    private const REGRAS = [
        'grade_horaria_id' => ['required', 'exists:grades_horarias,id'],
        'disciplina' => ['required', 'string', 'max:255'],
        'curso' => ['nullable', 'string', 'max:255'],
        'periodo' => ['required', 'in:manha,tarde,noite'],
        'status' => ['nullable', 'string', 'max:100'],
        'quantidade_aulas' => ['required', 'integer', 'min:0'],
    ];

    private const REGRAS_EDICAO = [
        'grade_horaria_id' => ['sometimes', 'exists:grades_horarias,id'],
        'disciplina' => ['sometimes', 'required', 'string', 'max:255'],
        'curso' => ['sometimes', 'nullable', 'string', 'max:255'],
        'periodo' => ['sometimes', 'required', 'in:manha,tarde,noite'],
        'status' => ['sometimes', 'nullable', 'string', 'max:100'],
        'quantidade_aulas' => ['sometimes', 'required', 'integer', 'min:0'],
    ];

    public function index(Request $request)
    {
        $query = ComponenteCurricular::query();

        if ($request->filled('grade_horaria_id')) {
            $query->where('grade_horaria_id', $request->integer('grade_horaria_id'));
        }

        return $query->orderBy('disciplina')->get();
    }

    public function store(Request $request)
    {
        $validado = $request->validate(self::REGRAS);

        return ComponenteCurricular::create($validado);
    }

    public function show(ComponenteCurricular $componenteCurricular)
    {
        return $componenteCurricular->load('aulas');
    }

    public function update(Request $request, ComponenteCurricular $componenteCurricular)
    {
        $validado = $request->validate(self::REGRAS_EDICAO);

        $componenteCurricular->update($validado);

        return $componenteCurricular->fresh();
    }

    public function destroy(ComponenteCurricular $componenteCurricular)
    {
        $componenteCurricular->delete();

        return response()->noContent();
    }
}