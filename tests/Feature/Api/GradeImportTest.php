<?php

namespace Tests\Feature\Api;

use App\Models\GradeHoraria;
use App\Services\GradeImport\GradeDocxParser;
use App\Services\GradeImport\GradeImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use RuntimeException;
use Tests\TestCase;

class GradeImportTest extends TestCase
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

    public function test_it_imports_a_synthetic_docx_and_persists_its_grade_components_and_classes(): void
    {
        Storage::fake('local');
        $docxPath = $this->createSyntheticGradeDocx();

        $response = $this->post('/api/grades', [
            'arquivo' => new UploadedFile(
                $docxPath,
                'grade.docx',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                null,
                true
            ),
        ], ['Accept' => 'application/json']);

        $response
            ->assertCreated()
            ->assertJsonPath('grade_horaria.semestre', '1/2026')
            ->assertJsonPath('grade_horaria.professor.nome', 'Ana Souza');

        $this->assertDatabaseHas('professores', [
            'matricula' => '12345',
            'nome' => 'Ana Souza',
        ]);
        $this->assertDatabaseHas('componentes_curriculares', [
            'disciplina' => 'Sistemas I',
            'curso' => 'Sistemas',
            'periodo' => 'manha',
        ]);
        $this->assertDatabaseHas('aulas', [
            'dia_semana' => 'segunda',
            'periodo' => 'manha',
            'hora_inicio' => '08:00',
            'hora_fim' => '09:00',
            'codigo_op' => '100',
        ]);

        $this->assertCount(1, Storage::files('grades-importadas'));
    }

    public function test_it_removes_the_uploaded_docx_when_parsing_fails(): void
    {
        Storage::fake('local');
        $docxPath = $this->createSyntheticGradeDocx();
        $this->mock(GradeDocxParser::class)
            ->shouldReceive('parse')
            ->once()
            ->andThrow(new RuntimeException('Falha sintética de parsing.'));

        $response = $this->post('/api/grades', [
            'arquivo' => new UploadedFile(
                $docxPath,
                'grade.docx',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                null,
                true
            ),
        ], ['Accept' => 'application/json']);

        $response->assertInternalServerError();
        $this->assertSame([], Storage::files('grades-importadas'));
        $this->assertSame(0, GradeHoraria::count());
    }

    public function test_it_removes_the_uploaded_docx_when_database_import_fails(): void
    {
        Storage::fake('local');
        $docxPath = $this->createSyntheticGradeDocx();
        $this->mock(GradeDocxParser::class)
            ->shouldReceive('parse')
            ->once()
            ->andReturn([]);
        $this->mock(GradeImportService::class)
            ->shouldReceive('importar')
            ->once()
            ->andThrow(new RuntimeException('Falha sintética de persistência.'));

        $response = $this->post('/api/grades', [
            'arquivo' => new UploadedFile(
                $docxPath,
                'grade.docx',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                null,
                true
            ),
        ], ['Accept' => 'application/json']);

        $response->assertInternalServerError();
        $this->assertSame([], Storage::files('grades-importadas'));
        $this->assertSame(0, GradeHoraria::count());
    }

    private function createSyntheticGradeDocx(): string
    {
        $word = new PhpWord;
        $section = $word->addSection();

        $dadosProfessor = $section->addTable();
        $dadosProfessor->addRow();
        foreach (['NOME', 'Ana Souza', 'CPF', '111.222.333-44', 'Matrícula', '12345', 'Contrato', 'Efetivo'] as $valor) {
            $dadosProfessor->addCell()->addText($valor);
        }

        $dadosGrade = $section->addTable();
        $dadosGrade->addRow();
        foreach (['SEMESTRE', '1/2026', 'Validade Início', '01/01/2026', 'Validade Fim', '31/12/2026'] as $valor) {
            $dadosGrade->addCell()->addText($valor);
        }

        $componentes = $section->addTable();
        $componentes->addRow();
        foreach (['Disciplina/Projeto', 'Curso', 'Período', 'Status', 'Qtde'] as $valor) {
            $componentes->addCell()->addText($valor);
        }
        $componentes->addRow();
        foreach (['Sistemas I', 'Sistemas', 'Manhã', 'Ministrando', '4'] as $valor) {
            $componentes->addCell()->addText($valor);
        }

        $grade = $section->addTable();
        $grade->addRow();
        foreach (['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'] as $dia) {
            $grade->addCell()->addText($dia);
        }
        $grade->addRow();
        $celulaSegunda = $grade->addCell();
        $celulaSegunda->addText('08:00 | 09:00');
        $celulaSegunda->addText('OP: 100');
        $celulaSegunda->addText('Sistemas I');
        foreach (range(1, 5) as $dia) {
            $grade->addCell();
        }

        $path = tempnam(sys_get_temp_dir(), 'grade_docx_');
        $this->temporaryFiles[] = $path;
        IOFactory::createWriter($word, 'Word2007')->save($path);

        return $path;
    }
}
