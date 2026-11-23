<?php

namespace App\Services\GradeImport;

/**
 * Confere a tabela "Horas Aulas" (disciplinas) com o quadro semanal (aulas) lidos de uma grade.
 *
 * Nenhum dado é descartado em silêncio: se uma aula pertence a uma disciplina que não foi lida na
 * tabela (por exemplo, por um nome de curso longo ou um layout diferente), a disciplina é criada a
 * partir das próprias aulas — usando só o nome que está escrito na grade — e a divergência vira um
 * aviso para o usuário revisar. Sem isso, as aulas dessa disciplina sumiam da folha de ponto.
 */
final class ConciliacaoDeDisciplinas
{
    /**
     * @param array<int, array{disciplina: string, curso: ?string, periodo: string, status: ?string, quantidade_aulas: int}> $componentes
     * @param array<int, array{disciplina: string, periodo: string}> $aulas
     *
     * @return array{componentes: array<int, array<string, mixed>>, avisos: string[]}
     */
    public static function conciliar(array $componentes, array $aulas): array
    {
        $avisos = [];

        $aulasPorChave = [];
        foreach ($aulas as $aula) {
            $nome = trim((string) ($aula['disciplina'] ?? ''));
            if ($nome === '') {
                $avisos[] = 'Uma aula foi lida sem o nome da disciplina e não foi importada.';
                continue;
            }

            $aulasPorChave[self::chave($nome)][] = $aula;
        }

        $chavesConhecidas = [];
        foreach ($componentes as $componente) {
            $chave = self::chave($componente['disciplina']);
            $chavesConhecidas[$chave] = true;
            $encontradas = count($aulasPorChave[$chave] ?? []);
            $nome = self::semSufixo($componente['disciplina']);

            if ($encontradas === 0) {
                $avisos[] = "A disciplina \"{$nome}\" consta na tabela de disciplinas, mas nenhuma aula dela foi encontrada no quadro semanal.";
            } elseif ($encontradas !== (int) $componente['quantidade_aulas']) {
                $avisos[] = "A disciplina \"{$nome}\" informa {$componente['quantidade_aulas']} aula(s) na tabela, mas {$encontradas} foram encontradas no quadro semanal.";
            }
        }

        foreach ($aulasPorChave as $chave => $aulasDaDisciplina) {
            if (isset($chavesConhecidas[$chave])) {
                continue;
            }

            $nome = trim((string) $aulasDaDisciplina[0]['disciplina']);
            $periodos = array_count_values(array_column($aulasDaDisciplina, 'periodo'));
            arsort($periodos);

            $componentes[] = [
                'disciplina' => $nome,
                'curso' => null,
                'periodo' => (string) array_key_first($periodos),
                'status' => null,
                'quantidade_aulas' => count($aulasDaDisciplina),
            ];

            $avisos[] = "A disciplina \"{$nome}\" aparece no quadro semanal, mas não foi lida na tabela de disciplinas; ela foi criada a partir das aulas, sem curso e sem status. Confira e complete os dados.";
        }

        return ['componentes' => $componentes, 'avisos' => $avisos];
    }

    /** Chave de comparação: sem "(Determinada)", sem acento, maiúscula e com espaços normalizados. */
    public static function chave(string $nome): string
    {
        $nome = mb_strtoupper(self::semSufixo($nome));
        $nome = preg_replace('/[\x{0300}-\x{036F}]/u', '', $nome) ?? $nome;
        $nome = strtr($nome, [
            'Á' => 'A', 'À' => 'A', 'Â' => 'A', 'Ã' => 'A', 'Ä' => 'A',
            'É' => 'E', 'È' => 'E', 'Ê' => 'E', 'Ë' => 'E',
            'Í' => 'I', 'Ì' => 'I', 'Î' => 'I', 'Ï' => 'I',
            'Ó' => 'O', 'Ò' => 'O', 'Ô' => 'O', 'Õ' => 'O', 'Ö' => 'O',
            'Ú' => 'U', 'Ù' => 'U', 'Û' => 'U', 'Ü' => 'U', 'Ç' => 'C',
        ]);

        return trim(preg_replace('/\s+/u', ' ', $nome) ?? $nome);
    }

    private static function semSufixo(string $nome): string
    {
        return trim(preg_replace('/\s*\(.*?\)\s*$/u', '', $nome) ?? $nome);
    }
}