<?php

namespace Tests\Unit\Services\GradeImport;

use App\Services\GradeImport\GradePdfParser;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Process\ExecutableFinder;

class GradePdfParserTest extends TestCase
{
    private array $temporaryFiles = [];

    protected function tearDown(): void
    {
        foreach ($this->temporaryFiles as $temporaryFile) {
            if (is_file($temporaryFile)) {
                unlink($temporaryFile);
            }
        }

        parent::tearDown();
    }

    public function test_it_extracts_synthetic_pdf_fields_and_components(): void
    {
        $finder = new ExecutableFinder;
        if ($finder->find('pdftotext') === null || $finder->find('pdftohtml') === null) {
            $this->markTestSkipped('Os testes do parser PDF requerem pdftotext e pdftohtml do Poppler.');
        }

        $pdfPath = $this->createSyntheticGradePdf();
        $dados = (new GradePdfParser)->parse($pdfPath);

        $this->assertSame([
            'nome' => 'Jane Doe',
            'matricula' => '12345',
            'cpf' => '111.222.333-44',
            'contrato' => 'Efetivo',
        ], $dados['professor']);
        $this->assertSame([
            'semestre' => '1/2026',
            'validade_inicio' => '01/01/2026',
            'validade_fim' => '31/12/2026',
        ], $dados['grade']);
        $this->assertSame([
            [
                'disciplina' => 'MATEMATICA',
                'curso' => 'Sistemas',
                'periodo' => 'manha',
                'status' => 'Ministrando',
                'quantidade_aulas' => 4,
            ],
        ], $dados['componentes']);
        $this->assertSame([], $dados['aulas']);
    }

    private function createSyntheticGradePdf(): string
    {
        $linhas = [
            [36, 750, 'NOME'],
            [72, 750, 'Jane Doe'],
            [160, 750, 'CPF'],
            [36, 730, 'Matricula 12345'],
            [36, 710, 'CPF 111.222.333-44'],
            [36, 690, 'Contrato Efetivo'],
            [36, 670, 'SEMESTRE 1/2026'],
            [36, 650, 'Validade Inicio 01/01/2026'],
            [36, 630, 'Validade Fim 31/12/2026'],
            [36, 600, 'Horas Aulas'],
            [36, 580, 'MATEMATICA'],
            [160, 580, 'Sistemas'],
            [250, 580, 'Manha'],
            [330, 580, 'Ministrando'],
            [450, 580, '4'],
            [36, 550, 'SEGUNDA TERCA QUARTA QUINTA SEXTA SABADO'],
        ];

        $stream = '';
        foreach ($linhas as [$left, $bottom, $texto]) {
            $textoPdf = strtr($texto, ['\\' => '\\\\', '(' => '\\(', ')' => '\\)']);
            $stream .= "BT /F1 10 Tf {$left} {$bottom} Td ({$textoPdf}) Tj ET\n";
        }

        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            '<< /Length '.strlen($stream)." >>\nstream\n{$stream}endstream",
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $indice => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($indice + 1)." 0 obj\n{$object}\nendobj\n";
        }

        $inicioXref = strlen($pdf);
        $pdf .= 'xref'."\n0 ".count($offsets)."\n";
        $pdf .= "0000000000 65535 f \n";
        foreach (array_slice($offsets, 1) as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= 'trailer'."\n<< /Size ".count($offsets)." /Root 1 0 R >>\n";
        $pdf .= "startxref\n{$inicioXref}\n%%EOF\n";

        $path = tempnam(sys_get_temp_dir(), 'grade_pdf_');
        $this->temporaryFiles[] = $path;
        file_put_contents($path, $pdf);

        return $path;
    }
}
