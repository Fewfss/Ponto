<?php

namespace App\Services\FolhaPonto;

use RuntimeException;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

class DocxToPdfConverter
{
    public function estaDisponivel(): bool
    {
        return $this->localizarSoffice() !== null;
    }

    /**
     * @return string caminho absoluto do .pdf gerado (na mesma pasta do .docx de entrada).
     */
    public function converter(string $caminhoDocxAbsoluto): string
    {
        if (! is_file($caminhoDocxAbsoluto)) {
            throw new RuntimeException("Arquivo não encontrado: {$caminhoDocxAbsoluto}");
        }

        // A primeira conversão pode demorar; evita o limite padrão de 30 s do PHP.
        @set_time_limit(180);

        $raiz = $this->pastaDeTrabalho();
        $home = $raiz.DIRECTORY_SEPARATOR.'home';
        $perfil = $raiz.DIRECTORY_SEPARATOR.'perfil';
        $pasta = $raiz.DIRECTORY_SEPARATOR.'conv_'.uniqid('', false);

        foreach ([$home, $perfil, $pasta, $home.DIRECTORY_SEPARATOR.'AppData'.DIRECTORY_SEPARATOR.'Roaming', $home.DIRECTORY_SEPARATOR.'AppData'.DIRECTORY_SEPARATOR.'Local'] as $dir) {
            if (! is_dir($dir) && ! mkdir($dir, 0777, true) && ! is_dir($dir)) {
                throw new RuntimeException("Não foi possível criar a pasta de trabalho: {$dir}");
            }
        }

        $trava = fopen($raiz.DIRECTORY_SEPARATOR.'conversao.lock', 'c');
        if ($trava !== false) {
            flock($trava, LOCK_EX);
        }

        try {
            $entrada = $pasta.DIRECTORY_SEPARATOR.'entrada.docx';
            if (! copy($caminhoDocxAbsoluto, $entrada)) {
                throw new RuntimeException("Não foi possível copiar o arquivo para: {$pasta}");
            }

            $executavel = $this->localizarSoffice();
            if ($executavel === null) {
                throw new RuntimeException('O PDF não está disponível neste ambiente.');
            }

            $process = new Process([
                $executavel,
                '--headless',
                '--norestore',
                '--nolockcheck',
                '-env:UserInstallation='.$this->paraFileUri($perfil),
                '--convert-to', 'pdf',
                '--outdir', $pasta,
                $entrada,
            ], $pasta, $this->ambiente($home, $raiz));
            $process->setTimeout(150);

            try {
                $process->run();
            } catch (ProcessTimedOutException) {
                throw new RuntimeException(
                    'O LibreOffice não respondeu a tempo. Finalize processos soffice.exe/soffice.bin pendentes e tente de novo.'
                );
            }

            $pdfTemporario = $pasta.DIRECTORY_SEPARATOR.'entrada.pdf';

            // Se o soffice terminou com sucesso mas o PDF ainda não apareceu (o soffice.exe do Windows
            // pode devolver o controle cedo), espera um pouco. Se falhou, não adianta esperar.
            if ($process->isSuccessful()) {
                for ($i = 0; $i < 40 && ! (is_file($pdfTemporario) && filesize($pdfTemporario) > 0); $i++) {
                    clearstatcache(true, $pdfTemporario);
                    usleep(500000);
                }
            }

            if (! is_file($pdfTemporario) || filesize($pdfTemporario) === 0) {
                throw new RuntimeException(
                    'Falha ao converter o documento para PDF. Executável: '.$executavel
                    .' | código de saída: '.$process->getExitCode()
                    .' | saída: '.trim($process->getErrorOutput().' '.$process->getOutput())
                );
            }

            $destino = dirname($caminhoDocxAbsoluto).DIRECTORY_SEPARATOR.pathinfo($caminhoDocxAbsoluto, PATHINFO_FILENAME).'.pdf';

            if (! copy($pdfTemporario, $destino)) {
                throw new RuntimeException("Não foi possível salvar o PDF em: {$destino}");
            }

            return $destino;
        } finally {
            if ($trava !== false) {
                flock($trava, LOCK_UN);
                fclose($trava);
            }

            $this->apagarPasta($pasta);
        }
    }

    /**
     * Variáveis de ambiente do soffice: sempre apontam para pastas nossas e graváveis.
     *
     * @return array<string, string>
     */
    private function ambiente(string $home, string $raiz): array
    {
        $env = ['HOME' => $home, 'TMPDIR' => $raiz];

        if (PHP_OS_FAMILY === 'Windows') {
            $sistema = getenv('SystemRoot') ?: getenv('SYSTEMROOT') ?: 'C:\\Windows';

            $env += [
                'USERPROFILE' => $home,
                'APPDATA' => $home.'\\AppData\\Roaming',
                'LOCALAPPDATA' => $home.'\\AppData\\Local',
                'TEMP' => $raiz,
                'TMP' => $raiz,
                'SystemRoot' => $sistema,
                'windir' => $sistema,
            ];
        }

        return $env;
    }

    private function pastaDeTrabalho(): string
    {
        $candidatas = [sys_get_temp_dir()];

        if (function_exists('storage_path')) {
            $candidatas[] = storage_path('framework');
        }

        foreach ($candidatas as $base) {
            $pasta = rtrim($base, '\\/').DIRECTORY_SEPARATOR.'ponto_libreoffice';

            if ((is_dir($pasta) || @mkdir($pasta, 0777, true)) && is_writable($pasta)) {
                return $pasta;
            }
        }

        throw new RuntimeException('Não há pasta temporária gravável para o LibreOffice.');
    }

    /**
     * Acha o executável sem depender do PATH (um alias do PowerShell não vale para o PHP):
     * LIBREOFFICE_BIN do .env; no Windows, "Arquivos de Programas" (preferindo o soffice.com,
     * versão de console que espera terminar); por fim o "soffice" do PATH (Linux).
     */
    private function localizarSoffice(): ?string
    {
        $configurado = env('LIBREOFFICE_BIN');
        $finder = new ExecutableFinder;

        if ($configurado) {
            $executavel = is_file($configurado)
                ? $configurado
                : $finder->find($configurado);

            return $executavel ? $this->preferirConsole($executavel) : null;
        }

        if (PHP_OS_FAMILY === 'Windows') {
            foreach (array_filter([getenv('ProgramFiles'), getenv('ProgramFiles(x86)'), 'C:\\Program Files', 'C:\\Program Files (x86)']) as $base) {
                foreach (['soffice.com', 'soffice.exe'] as $arquivo) {
                    $caminho = $base.'\\LibreOffice\\program\\'.$arquivo;

                    if (is_file($caminho)) {
                        return $caminho;
                    }
                }
            }
        }

        $executavel = $finder->find('soffice');

        return $executavel ? $this->preferirConsole($executavel) : null;
    }

    private function preferirConsole(string $caminho): string
    {
        if (PHP_OS_FAMILY === 'Windows' && preg_match('/\.exe$/i', $caminho)) {
            $com = substr($caminho, 0, -4).'.com';

            if (is_file($com)) {
                return $com;
            }
        }

        return $caminho;
    }

    /** "/tmp/x" -> "file:///tmp/x"; "C:\temp\x" -> "file:///C:/temp/x". */
    private function paraFileUri(string $caminho): string
    {
        $normalizado = str_replace('\\', '/', $caminho);

        if (! str_starts_with($normalizado, '/')) {
            $normalizado = '/'.$normalizado;
        }

        return 'file://'.$normalizado;
    }

    private function apagarPasta(string $pasta): void
    {
        if (! is_dir($pasta)) {
            return;
        }

        foreach (new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($pasta, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        ) as $item) {
            $item->isDir() ? @rmdir($item->getPathname()) : @unlink($item->getPathname());
        }

        @rmdir($pasta);
    }
}
