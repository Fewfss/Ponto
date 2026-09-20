<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GradeHoraria extends Model
{
    use HasFactory;

    protected $table = 'grades_horarias';

    protected $fillable = [
        'professor_id',
        'semestre',
        'validade_inicio',
        'validade_fim',
        'hora_aula_semanal',
        'arquivo_original',
        'dados_brutos',
    ];

    protected $casts = [
        'validade_inicio' => 'date',
        'validade_fim' => 'date',
        'dados_brutos' => 'array',
    ];

    public function professor(): BelongsTo
    {
        return $this->belongsTo(Professor::class);
    }

    public function componentesCurriculares(): HasMany
    {
        return $this->hasMany(ComponenteCurricular::class);
    }

    public function aulas(): HasMany
    {
        return $this->hasMany(Aula::class);
    }
}