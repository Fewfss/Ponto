<?php

namespace App\Services\FolhaPonto;

/**
 * Decide quais células de uma linha de dia da FOLHA DE FREQUÊNCIA ficam cinza,
 * para deixar claro ao professor onde NÃO é pra assinar:
 *
 *  - domingos e feriados: a linha inteira;
 *  - dias da semana em que ele não dá aula: a linha inteira;
 *  - períodos (manhã/tarde/noite) sem aula no dia: "Assinatura" e todas as aulas do período;
 *  - dias com aula só em alguns horários: as aulas que ele não dá (a coluna "Assinatura"
 *    do período fica em branco, pois ele assina ali).
 *
 * Layout de uma linha do modelo (21 células, índice 0-based):
 *   0 Dia | 1 Semana | 2 Assinatura + 3..8 (1º a 6º) manhã
 *   9 Assinatura + 10..15 (1º a 6º) tarde | 16 Assinatura + 17..20 (1º a 4º) noite
 */
final class SombreadoFrequencia
{
    public const TOTAL_DE_CELULAS = 21;
    public const PRIMEIRA_CELULA_DE_FREQUENCIA = 2;

    /** @var array<string, array{assinatura: int, aulas: int[]}> */
    private const COLUNAS = [
        'manha' => ['assinatura' => 2, 'aulas' => [3, 4, 5, 6, 7, 8]],
        'tarde' => ['assinatura' => 9, 'aulas' => [10, 11, 12, 13, 14, 15]],
        'noite' => ['assinatura' => 16, 'aulas' => [17, 18, 19, 20]],
    ];

    /**
     * @return int[] índices (0-based) das células que devem ficar cinza na linha
     */
    public static function celulasCinzas(string $diaSemanaSlug, bool $feriado, AgendaSemanal $agenda): array
    {
        if ($diaSemanaSlug === 'domingo' || $feriado) {
            return range(self::PRIMEIRA_CELULA_DE_FREQUENCIA, self::TOTAL_DE_CELULAS - 1);
        }

        // Grade sem nenhuma aula lida: provavelmente falha de leitura. Melhor não
        // pintar nada do que cobrir de cinza horários onde o professor deve assinar.
        if (! $agenda->possuiAulas()) {
            return [];
        }

        $cinzas = [];

        foreach (self::COLUNAS as $periodo => $colunas) {
            $aulas = $agenda->aulasDoDia($diaSemanaSlug, $periodo);

            if ($aulas === []) {
                $cinzas[] = $colunas['assinatura'];
                array_push($cinzas, ...$colunas['aulas']);
                continue;
            }

            foreach ($colunas['aulas'] as $indice => $celula) {
                if (! in_array($indice + 1, $aulas, true)) {
                    $cinzas[] = $celula;
                }
            }
        }

        return $cinzas;
    }
}
