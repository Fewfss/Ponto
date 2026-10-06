<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ComponenteCurricular extends Model
{
    use HasFactory;

    protected $table = 'componentes_curriculares';

    protected $fillable = [
        'grade_horaria_id',
        'disciplina',
        'curso',
        'periodo',
        'status',
        'quantidade_aulas',
    ];

    public function gradeHoraria(): BelongsTo
    {
        return $this->belongsTo(GradeHoraria::class);
    }

    public function aulas(): HasMany
    {
        return $this->hasMany(Aula::class);
    }
}