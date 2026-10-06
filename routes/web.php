<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Home');
});

Route::get('/grade-horaria', function () {
    return Inertia::render('Grade');
});
Route::get('/folha', function () {
    return Inertia::render('Folha');
});
