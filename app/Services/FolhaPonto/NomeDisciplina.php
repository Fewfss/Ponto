<?php

namespace App\Services\FolhaPonto;

/**
 * Nome curto da disciplina para a célula da grade horária da folha de ponto.
 *
 * Cabe no limite de caracteres da célula e continua reconhecível: a primeira palavra (a mais
 * identificadora: "Espanhol", "Gestão", "Banco") fica por extenso; só as demais são encurtadas, e
 * números romanos (I, II, IV...) são sempre mantidos.
 *
 *   ESPANHOL II            -> Espanhol II
 *   GESTÃO FINANCEIRA      -> Gestão Finan.
 *   BANCO DE DADOS I       -> Banco Dados I
 *   DESENVOLVIMENTO WEB II -> Desenvolv. II
 */
final class NomeDisciplina
{
    /** Máximo de caracteres que cabem na célula (medido no LibreOffice Draw: "pelo menos uns 13"). */
    public const LIMITE_PADRAO = 13;

    private const CONECTIVOS = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'para', 'por', 'com', 'a', 'o', 'as', 'os'];

    private const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

    public static function abreviar(string $nome, int $limite = self::LIMITE_PADRAO): string
    {
        $nome = trim(preg_replace('/\s*\(.*?\)\s*/u', ' ', $nome) ?? $nome); // tira "(Determinada)"
        $palavras = preg_split('/\s+/u', $nome, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if ($palavras === []) {
            return '';
        }

        $tokens = [];
        foreach ($palavras as $indice => $palavra) {
            $tokens[] = self::normalizar($palavra, $indice === 0);
        }

        $completo = implode(' ', $tokens);
        if (mb_strlen($completo) <= $limite) {
            return $completo;
        }

        // Sem conectivos ("de", "da", "e"...), exceto se for a primeira palavra.
        $tokens = array_values(array_filter(
            $tokens,
            fn ($t, $i) => $i === 0 || ! in_array(mb_strtolower($t), self::CONECTIVOS, true),
            ARRAY_FILTER_USE_BOTH
        ));

        $primeira = $tokens[0];
        $demais = array_slice($tokens, 1);
        $numerais = array_values(array_filter($demais, fn ($t) => self::ehNumeral($t)));

        if (mb_strlen($primeira) <= $limite) {
            // 1) Primeira palavra inteira + demais encurtadas para o maior tamanho (n letras + ".") que couber.
            for ($n = 7; $n >= 1; $n--) {
                $candidato = implode(' ', array_merge([$primeira], array_map(fn ($t) => self::encurtar($t, $n), $demais)));

                if (mb_strlen($candidato) <= $limite) {
                    return $candidato;
                }
            }

            // 2) Primeira palavra + só os números romanos/algarismos.
            $candidato = implode(' ', array_merge([$primeira], $numerais));

            if (mb_strlen($candidato) <= $limite) {
                return $candidato;
            }
        }

        // 3) Primeira palavra truncada (com ".") + números, para caber no limite.
        $sufixo = $numerais === [] ? '' : ' ' . implode(' ', $numerais);
        $espaco = max(2, $limite - mb_strlen($sufixo) - 1);

        return mb_substr($primeira, 0, $espaco) . '.' . $sufixo;
    }

    private static function normalizar(string $palavra, bool $primeira): string
    {
        if (! $primeira && self::ehNumeral($palavra)) {
            return mb_strtoupper($palavra);
        }

        $minuscula = mb_strtolower($palavra);

        if (! $primeira && in_array($minuscula, self::CONECTIVOS, true)) {
            return $minuscula;
        }

        return mb_strtoupper(mb_substr($minuscula, 0, 1)) . mb_substr($minuscula, 1);
    }

    private static function ehNumeral(string $token): bool
    {
        return in_array(mb_strtoupper($token), self::ROMANOS, true) || preg_match('/^\d+$/', $token) === 1;
    }

    /** "Financeira" -> "Finan." (n letras + ponto), só se isso realmente encurtar a palavra. */
    private static function encurtar(string $token, int $n): string
    {
        if (self::ehNumeral($token) || mb_strlen($token) <= $n + 1) {
            return $token;
        }

        return mb_substr($token, 0, $n) . '.';
    }
}