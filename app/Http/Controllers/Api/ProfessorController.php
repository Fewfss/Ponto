<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Professor;
use Illuminate\Http\Request;

class ProfessorController extends Controller
{
    public function index()
    {
        return Professor::orderBy('nome')->get();
    }

    public function show(Professor $professor)
    {
        return $professor->load(['gradesHorarias']);
    }

    public function update(Request $request, Professor $professor)
    {
        $validado = $request->validate([
            'nome' => ['sometimes', 'required', 'string', 'max:255'],
            'matricula' => ['sometimes', 'required', 'string', 'max:50', 'unique:professores,matricula,' . $professor->id],
            'cpf' => ['sometimes', 'nullable', 'string', 'max:20'],
            'regime_juridico' => ['sometimes', 'nullable', 'string', 'max:100'],
            'categoria' => ['sometimes', 'nullable', 'string', 'max:100'],
        ]);

        $professor->update($validado);

        return $professor->fresh();
    }
}