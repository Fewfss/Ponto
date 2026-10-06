<?php

namespace App\Services\GradeImport;

interface GradeParserInterface
{
    public function parse(string $caminhoArquivo): array;
}