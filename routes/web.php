<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Home');
});


Route::get('/grade-horaria', function () {
    return Inertia::render('Grade');
});
Route::get('//folhas-ponto', function () {
    return Inertia::render('Ponto');
});

Route::get('/teste', function () {
    return Inertia::render('teste');
});