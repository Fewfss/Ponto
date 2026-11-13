<?php

namespace Tests\Unit\Services\FolhaPonto;

use App\Services\FolhaPonto\Feriados;
use PHPUnit\Framework\TestCase;

class FeriadosTest extends TestCase
{
    public function test_it_calculates_easter_sunday(): void
    {
        $this->assertSame('2024-03-31', Feriados::pascoa(2024)->format('Y-m-d'));
        $this->assertSame('2025-04-20', Feriados::pascoa(2025)->format('Y-m-d'));
        $this->assertSame('2026-04-05', Feriados::pascoa(2026)->format('Y-m-d'));
    }

    public function test_it_includes_movable_holidays_in_the_right_month(): void
    {
        $this->assertSame([3 => 'Sexta-feira Santa', 21 => 'Tiradentes'], Feriados::doMes(4, 2026));
        $this->assertSame([4 => 'Corpus Christi'], Feriados::doMes(6, 2026));
        $this->assertSame([18, 21], array_keys(Feriados::doMes(4, 2025)));
        $this->assertSame([19], array_keys(Feriados::doMes(6, 2025)));
    }

    public function test_it_includes_national_state_and_city_holidays(): void
    {
        $this->assertSame([2, 15, 20], array_keys(Feriados::doMes(11, 2026)));
        $this->assertSame([9], array_keys(Feriados::doMes(7, 2026)));
        $this->assertSame([1, 25], array_keys(Feriados::doMes(1, 2026)));
        $this->assertSame([], Feriados::doMes(8, 2026));
    }

    public function test_it_accepts_extra_dates_only_inside_the_requested_month(): void
    {
        $feriados = Feriados::doMes(2, 2026, ['2026-02-16', '2026-02-17', '2026-03-01', '2025-02-20']);

        $this->assertSame([16, 17], array_keys($feriados));
    }
}
