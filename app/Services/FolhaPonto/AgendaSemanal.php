<?php

namespace App\Services\FolhaPonto;

final class AgendaSemanal
{
    public const INICIO_DAS_AULAS = [
        'manha' => ['07:30', '08:20', '09:20', '10:10', '11:10', '12:00'],
        'tarde' => ['13:00', '13:50', '14:50', '15:40', '16:40', '17:30'],
        'noite' => ['19:20', '20:10', '21:10', '22:00'],
    ];

    /** @var array<string, array<string, array<int, int>>> dia => período => [número da aula => número da aula] */
    private array $ocupacao = [];

    private int $totalDeAulas = 0;

    /**
     * @param iterable<object> $aulas objetos com dia_semana, periodo e hora_inicio (ex.: models Aula)
     */
    public static function deAulas(iterable $aulas): self
    {
        $agenda = new self();

        foreach ($aulas as $aula) {
            $periodo = (string) $aula->periodo;

            if (! isset(self::INICIO_DAS_AULAS[$periodo])) {
                continue;
            }

            $numero = self::numeroDaAula($periodo, (string) $aula->hora_inicio);
            $agenda->ocupacao[(string) $aula->dia_semana][$periodo][$numero] = $numero;
            $agenda->totalDeAulas++;
        }

        return $agenda;
    }

    public function possuiAulas(): bool
    {
        return $this->totalDeAulas > 0;
    }

    /**
     * @return int[] números (1..6) das aulas do professor naquele dia e período, em ordem crescente
     */
    public function aulasDoDia(string $diaSemanaSlug, string $periodo): array
    {
        $numeros = array_values($this->ocupacao[$diaSemanaSlug][$periodo] ?? []);
        sort($numeros);

        return $numeros;
    }

    public static function numeroDaAula(string $periodo, string $horaInicio): int
    {
        $hhmm = substr($horaInicio, 0, 5); // "09:50:00" -> "09:50"
        $numero = 1;

        foreach (self::INICIO_DAS_AULAS[$periodo] as $indice => $inicio) {
            if ($hhmm >= $inicio) {
                $numero = $indice + 1;
            }
        }

        return $numero;
    }
}
