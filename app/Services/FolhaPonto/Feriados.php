<?php

namespace App\Services\FolhaPonto;

use DateTimeImmutable;
use DateTimeInterface;

/**
 * Feriados que impedem a assinatura da folha de ponto (ficam cinza na tabela
 * de frequência, igual aos domingos).
 *
 * A lista cobre a cidade de São Paulo:
 *  - nacionais fixos;
 *  - nacionais móveis;
 *  - estadual de SP;
 *  - municipais de São Paulo.
 *
 * Pontos facultativos (Carnaval, 24 e 31 de dezembro, recessos da faculdade...)
 * NÃO entram por padrão, porque variam a cada ano: use $extras para informá-los.
 */
class Feriados
{
    /** @var array<string, string> 'mm-dd' => nome */
    private const FIXOS = [
        '01-01' => 'Confraternização Universal',
        '01-25' => 'Aniversário da cidade de São Paulo',
        '04-21' => 'Tiradentes',
        '05-01' => 'Dia do Trabalho',
        '07-09' => 'Revolução Constitucionalista (SP)',
        '09-07' => 'Independência do Brasil',
        '10-12' => 'Nossa Senhora Aparecida',
        '11-02' => 'Finados',
        '11-15' => 'Proclamação da República',
        '11-20' => 'Dia da Consciência Negra',
        '12-25' => 'Natal',
    ];

    /**
     * @param array<int, string|DateTimeInterface> $extras datas adicionais (ex.: "2026-02-17" para um ponto
     *        facultativo ou recesso); só as que caem no mês/ano pedido são consideradas.
     *
     * @return array<int, string> dia do mês (1..31) => nome do feriado, ordenado por dia
     */
    public static function doMes(int $mes, int $ano, array $extras = []): array
    {
        $feriados = [];

        foreach (self::FIXOS as $mesDia => $nome) {
            [$m, $d] = array_map('intval', explode('-', $mesDia));
            if ($m === $mes) {
                $feriados[$d] = $nome;
            }
        }

        $pascoa = self::pascoa($ano);
        $moveis = [
            'Sexta-feira Santa' => $pascoa->modify('-2 days'),
            'Corpus Christi' => $pascoa->modify('+60 days'),
        ];

        foreach ($moveis as $nome => $data) {
            if ((int) $data->format('n') === $mes && (int) $data->format('Y') === $ano) {
                $feriados[(int) $data->format('j')] = $nome;
            }
        }

        foreach ($extras as $extra) {
            $data = $extra instanceof DateTimeInterface ? $extra : date_create_immutable((string) $extra);

            if ($data !== false && (int) $data->format('n') === $mes && (int) $data->format('Y') === $ano) {
                $feriados[(int) $data->format('j')] ??= 'Feriado/recesso informado';
            }
        }

        ksort($feriados);

        return $feriados;
    }

    /**
     * Domingo de Páscoa (algoritmo gregoriano anônimo, "Meeus/Jones/Butcher"),
     * sem depender da extensão ext-calendar do PHP.
     */
    public static function pascoa(int $ano): DateTimeImmutable
    {
        $a = $ano % 19;
        $b = intdiv($ano, 100);
        $c = $ano % 100;
        $d = intdiv($b, 4);
        $e = $b % 4;
        $f = intdiv($b + 8, 25);
        $g = intdiv($b - $f + 1, 3);
        $h = (19 * $a + $b - $d - $g + 15) % 30;
        $i = intdiv($c, 4);
        $k = $c % 4;
        $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
        $m = intdiv($a + 11 * $h + 22 * $l, 451);
        $mes = intdiv($h + $l - 7 * $m + 114, 31);
        $dia = (($h + $l - 7 * $m + 114) % 31) + 1;

        return new DateTimeImmutable(sprintf('%04d-%02d-%02d', $ano, $mes, $dia));
    }
}
