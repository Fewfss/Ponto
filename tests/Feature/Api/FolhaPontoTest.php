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

    public function test_it_reports_when_pdf_generation_is_available(): void
    {
        $this->mock(DocxToPdfConverter::class)
            ->shouldReceive('estaDisponivel')
            ->once()
            ->andReturn(true);

        $this->getJson('/api/folhas-ponto/capabilities')
            ->assertOk()
            ->assertJsonPath('pdf_disponivel', true);
    }

    public function test_it_reports_when_pdf_generation_is_unavailable(): void
    {
        $this->mock(DocxToPdfConverter::class)
            ->shouldReceive('estaDisponivel')
            ->once()
            ->andReturn(false);

        $this->getJson('/api/folhas-ponto/capabilities')
            ->assertOk()
            ->assertJsonPath('pdf_disponivel', false);
    }

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

    public function test_it_downloads_a_zip_with_the_generated_sheets(): void
    {
        Storage::fake('local');
        $this->createSyntheticTemplate();
        [$firstProfessor] = $this->createProfessorWithGrade();
        [$secondProfessor] = $this->createProfessorWithGrade('67890');

        $firstResponse = $this->postJson("/api/professores/{$firstProfessor->id}/folhas-ponto", [
            'mes' => 3,
            'ano' => 2026,
            'formato' => 'docx',
        ])->assertCreated();
        $secondResponse = $this->postJson("/api/professores/{$secondProfessor->id}/folhas-ponto", [
            'mes' => 3,
            'ano' => 2026,
            'formato' => 'docx',
        ])->assertCreated();

        $response = $this->post('/api/folhas-ponto/download-zip', [
            'folha_ponto_ids' => [
                $firstResponse->json('folha_ponto.id'),
                $secondResponse->json('folha_ponto.id'),
            ],
            'formato' => 'docx',
        ]);

        $response->assertDownload('folhas-ponto.zip');
        $zipPath = $response->baseResponse->getFile()->getPathname();
        $this->temporaryFiles[] = $zipPath;

        $zip = new ZipArchive;
        $this->assertSame(true, $zip->open($zipPath));
        $this->assertSame(2, $zip->numFiles);
        $this->assertNotFalse($zip->locateName('12345-ana-souza-03-2026-'.$firstResponse->json('folha_ponto.id').'.docx'));
        $this->assertNotFalse($zip->locateName('67890-ana-souza-03-2026-'.$secondResponse->json('folha_ponto.id').'.docx'));
        $zip->close();
    }

    public function test_it_returns_not_found_when_a_requested_sheet_file_is_missing(): void
    {
        Storage::fake('local');
        [$professor] = $this->createProfessorWithGrade();
        $folha = FolhaPonto::create([
            'professor_id' => $professor->id,
            'mes' => 3,
            'ano' => 2026,
            'arquivo_gerado' => 'folhas-ponto/ausente.docx',
            'status' => 'gerada',
        ]);

        $this->postJson('/api/folhas-ponto/download-zip', [
            'folha_ponto_ids' => [$folha->id],
            'formato' => 'docx',
        ])->assertNotFound();
    }

    public function test_it_downloads_a_zip_with_pdf_sheets(): void
    {
        Storage::fake('local');
        [$professor] = $this->createProfessorWithGrade();
        Storage::put('folhas-ponto/12345/ana-souza-03-2026.pdf', '%PDF synthetic test output');
        $folha = FolhaPonto::create([
            'professor_id' => $professor->id,
            'mes' => 3,
            'ano' => 2026,
            'arquivo_gerado' => 'folhas-ponto/12345/ana-souza-03-2026.docx',
            'arquivo_gerado_pdf' => 'folhas-ponto/12345/ana-souza-03-2026.pdf',
            'status' => 'gerada',
        ]);

        $response = $this->post('/api/folhas-ponto/download-zip', [
            'folha_ponto_ids' => [$folha->id],
            'formato' => 'pdf',
        ]);

        $response->assertDownload('folhas-ponto.zip');
        $zipPath = $response->baseResponse->getFile()->getPathname();
        $this->temporaryFiles[] = $zipPath;

        $zip = new ZipArchive;
        $this->assertSame(true, $zip->open($zipPath));
        $this->assertStringEndsWith('.pdf', $zip->getNameIndex(0));
        $this->assertSame('%PDF synthetic test output', $zip->getFromIndex(0));
        $zip->close();
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

    private function createProfessorWithGrade(string $matricula = '12345'): array
    {
        $professor = Professor::create([
            'nome' => 'Ana Souza',
            'matricula' => $matricula,
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
