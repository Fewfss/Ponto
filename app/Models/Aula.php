<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Aula extends Model
{
    use HasFactory;

    protected $table = 'aulas';

    protected $fillable = [
        'grade_horaria_id',
        'componente_curricular_id',
        'dia_semana',
        'periodo',
        'ordem_horario',
        'hora_inicio',
        'hora_fim',
        'codigo_op',
    ];

    public function gradeHoraria(): BelongsTo
    {
        return $this->belongsTo(GradeHoraria::class);
    }

    public function componenteCurricular(): BelongsTo
    {
        return $this->belongsTo(ComponenteCurricular::class);
    }
}