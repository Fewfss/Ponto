<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Professor extends Model
{
    use HasFactory;

    protected $table = 'professores';

    protected $fillable = [
        'nome',
        'matricula',
        'cpf',
        'regime_juridico',
        'categoria',
    ];

    public function gradesHorarias(): HasMany
    {
        return $this->hasMany(GradeHoraria::class);
    }

    public function folhasPonto(): HasMany
    {
        return $this->hasMany(FolhaPonto::class);
    }

    public function gradeAtual(): ?GradeHoraria
    {
        return $this->gradesHorarias()
            ->where(function ($q) {
                $q->whereNull('validade_fim')->orWhere('validade_fim', '>=', now());
            })
            ->latest('validade_inicio')
            ->first()
            ?? $this->gradesHorarias()->latest()->first();
    }
}