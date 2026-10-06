<?php

use App\Http\Controllers\Api\AulaController;
use App\Http\Controllers\Api\ComponenteCurricularController;
use App\Http\Controllers\Api\FolhaPontoController;
use App\Http\Controllers\Api\GradeHorariaController;
use App\Http\Controllers\Api\GradeImportController;
use App\Http\Controllers\Api\ProfessorController;
use Illuminate\Support\Facades\Route;

// rotas para importação de dados do PDF da grade horária

Route::post('/grades', [GradeImportController::class, 'store']);

Route::post('/professores/{professor}/folhas-ponto', [FolhaPontoController::class, 'store']);

// rotas para consulta e edição de dados já importados

Route::get('/professores', [ProfessorController::class, 'index']);
Route::get('/professores/{professor}', [ProfessorController::class, 'show']);
Route::match(['put', 'patch'], '/professores/{professor}', [ProfessorController::class, 'update']);

Route::get('/grades-horarias/{gradeHoraria}', [GradeHorariaController::class, 'show']);
Route::match(['put', 'patch'], '/grades-horarias/{gradeHoraria}', [GradeHorariaController::class, 'update']);

Route::apiResource('componentes-curriculares', ComponenteCurricularController::class)
    ->only(['index', 'store', 'show', 'update', 'destroy']);

Route::apiResource('aulas', AulaController::class)
    ->only(['index', 'store', 'show', 'update', 'destroy']);