<?php

namespace App\Services\FolhaPonto;

use Carbon\Carbon;

/**
 * Calcula os dias válidos de um mês/ano e o dia da semana (em português)
 * correspondente a cada um — usado para preencher a tabela "FOLHA DE
 * FREQUÊNCIA" (linhas 01..28/29/30/31) do modelo oficial.
 */
class CalendarioMensal
{
    private const DIAS_SEMANA_PT = [
        0 => 'Domingo',
        1 => 'Segunda',
        2 => 'Terça',
        3 => 'Quarta',
        4 => 'Quinta',
        5 => 'Sexta',
        6 => 'Sábado',
    ];

    // Mesmos valores, normalizados (sem acento/minúsculo) — úteis para bater
    // com o enum `dia_semana` usado na tabela `aulas`.
    private const DIAS_SEMANA_SLUG = [
        0 => 'domingo',
        1 => 'segunda',
        2 => 'terca',
        3 => 'quarta',
        4 => 'quinta',
        5 => 'sexta',
        6 => 'sabado',
    ];

    /**
     * @return array<int, array{dia: int, dia_semana: string, dia_semana_slug: string}>
     *         Uma entrada por dia válido do mês, na ordem 01, 02, ... até o
     *         último dia do mês (28/29/30/31 conforme o caso).
     */
    public static function diasDoMes(int $mes, int $ano): array
    {
        $totalDias = Carbon::createFromDate($ano, $mes, 1)->daysInMonth;

        $dias = [];
        for ($dia = 1; $dia <= $totalDias; $dia++) {
            $data = Carbon::createFromDate($ano, $mes, $dia);
            $weekday = (int) $data->format('w'); // 0 (domingo) .. 6 (sábado)

            $dias[] = [
                'dia' => $dia,
                'dia_semana' => self::DIAS_SEMANA_PT[$weekday],
                'dia_semana_slug' => self::DIAS_SEMANA_SLUG[$weekday],
            ];
        }

        return $dias;
    }

    public static function nomeMesAno(int $mes, int $ano): string
    {
        return sprintf('%02d/%04d', $mes, $ano);
    }
}