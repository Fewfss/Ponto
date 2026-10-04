<?php

namespace App\Services\FolhaPonto;

use RuntimeException;
use Symfony\Component\Process\Process;

class DocxToPdfConverter
{
    /**
     * @return string caminho absoluto do .pdf gerado (na mesma pasta do .docx de entrada).
     */
    public function converter(string $caminhoDocxAbsoluto): string
    {
        if (! file_exists($caminhoDocxAbsoluto)) {
            throw new RuntimeException("Arquivo não encontrado: {$caminhoDocxAbsoluto}");
        }

        $pastaDestino = dirname($caminhoDocxAbsoluto);
        $perfilTemporario = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'lo_profile_' . uniqid();

        $process = new Process([
            'soffice',
            '--headless',
            '--norestore',
            '--convert-to', 'pdf',
            '--outdir', $pastaDestino,
            '-env:UserInstallation=' . $this->paraFileUri($perfilTemporario),
            $caminhoDocxAbsoluto,
        ]);
        $process->setTimeout(90);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException(
                'Falha ao converter o documento para PDF (LibreOffice instalado e no PATH?): '
                . $process->getErrorOutput()
            );
        }

        $nomeBase = pathinfo($caminhoDocxAbsoluto, PATHINFO_FILENAME);
        $caminhoPdf = $pastaDestino . DIRECTORY_SEPARATOR . $nomeBase . '.pdf';

        if (! file_exists($caminhoPdf)) {
            throw new RuntimeException("O LibreOffice não gerou o PDF esperado em: {$caminhoPdf}");
        }

        return $caminhoPdf;
    }

    private function paraFileUri(string $caminho): string
    {
        $normalizado = str_replace('\\', '/', $caminho);

        if (! str_starts_with($normalizado, '/')) {
            $normalizado = '/' . $normalizado;
        }

        return 'file://' . $normalizado;
    }
}