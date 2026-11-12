<?php

namespace Tests\Feature\Api;

use App\Models\Aula;
use App\Models\ComponenteCurricular;
use App\Models\FolhaPonto;
use App\Models\GradeHoraria;
use App\Models\Professor;
use App\Services\FolhaPonto\DocxToPdfConverter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use Tests\TestCase;
use ZipArchive;

class FolhaPontoTest extends TestCase
{
    use RefreshDatabase;

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

    public function test_it_generates_a_docx_with_the_grade_and_leap_year_calendar(): void
    {
        Storage::fake('local');
        $this->createSyntheticTemplate();
        [$professor] = $this->createProfessorWithGrade();

        $response = $this->postJson("/api/professores/{$professor->id}/folhas-ponto", [
            'mes' => 2,
            'ano' => 2024,
            'formato' => 'docx',
        ]);

        $response->assertCreated();
        $folha = FolhaPonto::query()->sole();
        $this->assertSame('gerada', $folha->status);
        $this->assertTrue(Storage::exists($folha->arquivo_gerado));

        $zip = new ZipArchive;
        $this->assertSame(true, $zip->open(Storage::path($folha->arquivo_gerado)));
        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        $this->assertIsString($xml);
        $this->assertStringContainsString('S. I.', $xml);
        $this->assertStringContainsString('02/2024', $xml);
        $this->assertStringContainsString('29', $xml);
        $this->assertStringNotContainsString('30', $xml);
    }

    public function test_it_generates_a_pdf_when_the_converter_produces_the_file(): void
    {
        Storage::fake('local');
        $this->createSyntheticTemplate();
        [$professor] = $this->createProfessorWithGrade();
        $pdfPath = tempnam(sys_get_temp_dir(), 'folha_pdf_');
        $this->temporaryFiles[] = $pdfPath;
        file_put_contents($pdfPath, '%PDF synthetic test output');

        $this->mock(DocxToPdfConverter::class)
            ->shouldReceive('converter')
            ->once()
            ->andReturn($pdfPath);

        $response = $this->postJson("/api/professores/{$professor->id}/folhas-ponto", [
            'mes' => 3,
            'ano' => 2026,
            'formato' => 'pdf',
        ]);

        $response->assertCreated();
        $folha = FolhaPonto::query()->sole();
        $this->assertNotNull($folha->arquivo_gerado_pdf);
        $this->assertTrue(Storage::exists($folha->arquivo_gerado_pdf));
        $this->assertSame('%PDF synthetic test output', Storage::get($folha->arquivo_gerado_pdf));
        $response->assertJsonPath('download_url', "/api/folhas-ponto/{$folha->id}/download?formato=pdf");
    }

    private function createProfessorWithGrade(): array
    {
        $professor = Professor::create([
            'nome' => 'Ana Souza',
            'matricula' => '12345',
            'regime_juridico' => 'Efetivo',
        ]);

        $grade = GradeHoraria::create([
            'professor_id' => $professor->id,
            'semestre' => '1/2026',
            'validade_inicio' => '2026-01-01',
            'validade_fim' => '2026-12-31',
            'hora_aula_semanal' => 4,
        ]);

        $componente = ComponenteCurricular::create([
            'grade_horaria_id' => $grade->id,
            'disciplina' => 'Sistemas I',
            'curso' => 'Sistemas',
            'periodo' => 'manha',
            'status' => 'Ministrando',
            'quantidade_aulas' => 4,
        ]);

        Aula::create([
            'grade_horaria_id' => $grade->id,
            'componente_curricular_id' => $componente->id,
            'dia_semana' => 'segunda',
            'periodo' => 'manha',
            'ordem_horario' => 1,
            'hora_inicio' => '08:00',
            'hora_fim' => '09:00',
            'codigo_op' => '100',
        ]);

        return [$professor, $grade];
    }

    private function createSyntheticTemplate(): void
    {
        Storage::makeDirectory('templates');
        $templatePath = Storage::path('templates/folha_ponto_modelo.docx');

        $word = new PhpWord;
        $section = $word->addSection();
        $section->addText('Professor ${professor_nome} / ${matricula}');
        $section->addText('Mês ${mes_ano}');

        $grade = $section->addTable();
        foreach (range(0, 2) as $linha) {
            $grade->addRow();
            foreach (range(0, 8) as $coluna) {
                $celula = $grade->addCell();
                if ($linha === 0 && $coluna < 3) {
                    $celula->addText(['MANHÃ', 'TARDE', 'NOITE'][$coluna]);
                }
            }
        }
        foreach (['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as $dia) {
            $grade->addRow();
            foreach (range(0, 8) as $coluna) {
                $celula = $grade->addCell();
                if ($coluna === 0) {
                    $celula->addText($dia);
                }
            }
        }

        $calendario = $section->addTable();
        $calendario->addRow();
        $calendario->addCell()->addText('Dia');
        $calendario->addCell()->addText('Semana');
        $calendario->addRow();
        $calendario->addCell()->addText('Número');
        $calendario->addCell()->addText('Dia da semana');
        foreach (range(1, 31) as $dia) {
            $calendario->addRow();
            $calendario->addCell()->addText(str_pad((string) $dia, 2, '0', STR_PAD_LEFT));
            $calendario->addCell()->addText('');
        }

        IOFactory::createWriter($word, 'Word2007')->save($templatePath);
    }
}
