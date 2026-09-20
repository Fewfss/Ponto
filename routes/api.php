<?php

use App\Http\Controllers\Api\FolhaPontoController;
use App\Http\Controllers\Api\GradeImportController;
use Illuminate\Support\Facades\Route;

// Trecho para adicionar/mesclar no routes/api.php do projeto.
// Sem middleware de autenticação por enquanto.

Route::post('/grades', [GradeImportController::class, 'store']);

Route::post('/professores/{professor}/folhas-ponto', [FolhaPontoController::class, 'store']);