<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FolhaPonto extends Model
{
    use HasFactory;

    protected $table = 'folhas_ponto';

    protected $fillable = [
        'professor_id',
        'grade_horaria_id',
        'mes',
        'ano',
        'arquivo_gerado',
        'status',
    ];

    public function professor(): BelongsTo
    {
        return $this->belongsTo(Professor::class);
    }

    public function gradeHoraria(): BelongsTo
    {
        return $this->belongsTo(GradeHoraria::class);
    }
}