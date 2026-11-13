<?php

namespace Tests\Unit\Services\FolhaPonto;

use App\Services\FolhaPonto\AgendaSemanal;
use App\Services\FolhaPonto\SombreadoFrequencia;
use PHPUnit\Framework\TestCase;

class SombreadoFrequenciaTest extends TestCase
{
    private function aula(string $dia, string $periodo, string $inicio): object
    {
        return (object) ['dia_semana' => $dia, 'periodo' => $periodo, 'hora_inicio' => $inicio];
    }

    public function test_it_maps_start_times_to_the_class_number_of_the_period(): void
    {
        $this->assertSame(1, AgendaSemanal::numeroDaAula('manha', '07:30:00'));
        $this->assertSame(2, AgendaSemanal::numeroDaAula('manha', '08:20'));
        $this->assertSame(3, AgendaSemanal::numeroDaAula('manha', '09:50'));
        $this->assertSame(4, AgendaSemanal::numeroDaAula('manha', '10:40'));
        $this->assertSame(2, AgendaSemanal::numeroDaAula('noite', '21:00'));
    }

    public function test_sundays_and_holidays_are_gray_in_the_whole_row(): void
    {
        $agenda = AgendaSemanal::deAulas([$this->aula('segunda', 'manha', '07:30')]);
        $todas = range(2, 20);

        $this->assertSame($todas, SombreadoFrequencia::celulasCinzas('domingo', false, $agenda));
        $this->assertSame($todas, SombreadoFrequencia::celulasCinzas('segunda', true, $agenda));
    }

    public function test_weekdays_without_classes_are_gray_in_the_whole_row(): void
    {
        $agenda = AgendaSemanal::deAulas([$this->aula('quarta', 'noite', '19:20')]);

        $this->assertSame(range(2, 20), SombreadoFrequencia::celulasCinzas('terca', false, $agenda));
    }

    public function test_only_the_classes_the_teacher_gives_stay_white(): void
    {
        $agenda = AgendaSemanal::deAulas([
            $this->aula('sabado', 'manha', '07:30'),
            $this->aula('sabado', 'manha', '08:20'),
            $this->aula('sabado', 'manha', '09:50'),
            $this->aula('sabado', 'manha', '10:40'),
        ]);

        $cinzas = SombreadoFrequencia::celulasCinzas('sabado', false, $agenda);

        // manhã: assinatura (2) e 1ª a 4ª aula (3..6) em branco; 5ª e 6ª (7, 8) cinza; tarde e noite cinza
        $this->assertSame(array_merge([7, 8], range(9, 20)), $cinzas);
    }

    public function test_a_period_without_classes_is_gray_including_its_signature_column(): void
    {
        $agenda = AgendaSemanal::deAulas([
            $this->aula('quarta', 'noite', '19:20'),
            $this->aula('quarta', 'noite', '20:10'),
        ]);

        $cinzas = SombreadoFrequencia::celulasCinzas('quarta', false, $agenda);

        $this->assertSame(array_merge(range(2, 15), [19, 20]), $cinzas);
    }

    public function test_an_empty_grade_does_not_gray_out_ordinary_weekdays(): void
    {
        $this->assertSame([], SombreadoFrequencia::celulasCinzas('segunda', false, AgendaSemanal::deAulas([])));
    }
}
