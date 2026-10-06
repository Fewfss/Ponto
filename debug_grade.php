<?php

/**
 * Script de diagnóstico — roda FORA do Laravel, só pra ver exatamente o
 * que o pdftohtml está devolvendo na sua máquina.
 *
 * Uso:
 *   php debug_grade.php "C:\caminho\para\Grade_Exemplo.pdf"
 */

if ($argc < 2) {
    fwrite(STDERR, "Uso: php debug_grade.php caminho-do-pdf.pdf\n");
    exit(1);
}

$pdfPath = $argv[1];

if (! file_exists($pdfPath)) {
    fwrite(STDERR, "Arquivo não encontrado: {$pdfPath}\n");
    exit(1);
}

echo "=== 1) Rodando pdftohtml ===\n";

$comando = sprintf(
    'pdftohtml -xml -i -enc UTF-8 -stdout %s',
    escapeshellarg($pdfPath)
);

echo "Comando: {$comando}\n\n";

$saida = shell_exec($comando . ' 2>&1');

if ($saida === null || trim($saida) === '') {
    echo "!! O comando não devolveu nada. Isso indica que o binário\n";
    echo "   'pdftohtml' não foi encontrado no PATH usado pelo PHP, ou falhou.\n";
    echo "   Tente rodar o comando acima direto no terminal e veja o que aparece.\n";
    exit(1);
}

echo '=== 2) Tamanho da saída: ' . strlen($saida) . " bytes ===\n\n";

// Salva a saída bruta em disco pra você poder abrir e inspecionar também.
file_put_contents(__DIR__ . '/debug_saida.xml', $saida);
echo "Saída completa salva em: " . __DIR__ . "/debug_saida.xml\n\n";

echo "=== 3) Tentando interpretar como XML ===\n";

libxml_use_internal_errors(true);
$xml = simplexml_load_string($saida);

if ($xml === false) {
    echo "!! simplexml_load_string FALHOU. Erros do libxml:\n";
    foreach (libxml_get_errors() as $erro) {
        echo "   - " . trim($erro->message) . " (linha {$erro->line})\n";
    }
    echo "\nIsso geralmente significa que a saída não é XML válido (ex.: o\n";
    echo "binário imprimiu um aviso/erro junto com o XML). Abra o debug_saida.xml\n";
    echo "e veja se tem algo estranho no começo ou no fim do arquivo.\n";
    exit(1);
}

echo "OK, XML válido.\n\n";

echo "=== 4) Todos os elementos de texto extraídos (top, left, texto) ===\n";

$elementos = [];
foreach ($xml->page as $page) {
    foreach ($page->text as $text) {
        $conteudo = trim((string) $text);
        if ($conteudo === '') {
            continue;
        }
        $elementos[] = [
            'top' => (int) $text['top'],
            'left' => (int) $text['left'],
            'texto' => $conteudo,
        ];
    }
}

echo "Total de elementos de texto: " . count($elementos) . "\n\n";

foreach ($elementos as $el) {
    printf("top=%-5d left=%-5d texto=%s\n", $el['top'], $el['left'], $el['texto']);
}

echo "\n=== 5) Procurando os cabeçalhos de dia da semana ===\n";

function dobrarParaComparacao(string $texto): string
{
    $semCombinantes = preg_replace('/[\x{0300}-\x{036F}]/u', '', $texto);
    $mapa = [
        'Á' => 'A', 'À' => 'A', 'Â' => 'A', 'Ã' => 'A', 'Ä' => 'A',
        'É' => 'E', 'È' => 'E', 'Ê' => 'E', 'Ë' => 'E',
        'Í' => 'I', 'Ì' => 'I', 'Î' => 'I', 'Ï' => 'I',
        'Ó' => 'O', 'Ò' => 'O', 'Ô' => 'O', 'Õ' => 'O', 'Ö' => 'O',
        'Ú' => 'U', 'Ù' => 'U', 'Û' => 'U', 'Ü' => 'U',
        'Ç' => 'C',
    ];
    return trim(strtr(mb_strtoupper($semCombinantes), $mapa));
}

$diasEsperados = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
$encontrados = 0;

foreach ($elementos as $el) {
    $normalizado = dobrarParaComparacao($el['texto']);
    $bateu = in_array($normalizado, $diasEsperados, true);

    if ($bateu || mb_strlen($el['texto']) <= 10) {
        // Mostra tanto os que bateram quanto textos curtos (candidatos),
        // pra vermos se algum dia da semana está *quase* batendo.
        $marca = $bateu ? '✔ BATEU' : '  candidato';
        if ($bateu) {
            $encontrados++;
            echo "{$marca} | original=\"{$el['texto']}\" | normalizado=\"{$normalizado}\" | top={$el['top']} left={$el['left']}\n";
        }
    }
}

echo "\nTotal de cabeçalhos de dia encontrados: {$encontrados} (esperado: 18 => 6 dias x 3 blocos manhã/tarde/noite)\n";

if ($encontrados === 0) {
    echo "\n!! Nenhum cabeçalho de dia bateu. Procurando candidatos parecidos...\n";
    foreach ($elementos as $el) {
        if (mb_strlen($el['texto']) >= 5 && mb_strlen($el['texto']) <= 10) {
            echo "candidato: \"{$el['texto']}\" (normalizado: \"" . dobrarParaComparacao($el['texto']) . "\") top={$el['top']} left={$el['left']}\n";
        }
    }
}
