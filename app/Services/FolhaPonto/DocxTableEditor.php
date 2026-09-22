<?php

namespace App\Services\FolhaPonto;

use DOMDocument;
use DOMElement;
use DOMXPath;
use RuntimeException;

class DocxTableEditor
{
    public const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

    private DOMDocument $dom;
    private DOMXPath $xpath;

    public function __construct(string $documentXml)
    {
        $this->dom = new DOMDocument();
        $this->dom->preserveWhiteSpace = true;
        $this->dom->loadXML($documentXml);

        $this->xpath = new DOMXPath($this->dom);
        $this->xpath->registerNamespace('w', self::W_NS);
    }

    public function toXml(): string
    {
        return $this->dom->saveXML();
    }

    public function localizarTabelaPorTextosNaPrimeiraLinha(array $textosEsperados): DOMElement
    {
        foreach ($this->xpath->query('//w:tbl') as $tabela) {
            $primeiraLinha = $this->xpath->query('.//w:tr', $tabela)->item(0);
            if ($primeiraLinha === null) {
                continue;
            }

            $textoLinha = $this->textoDoNo($primeiraLinha);
            $encontrouTodos = true;
            foreach ($textosEsperados as $esperado) {
                if (mb_stripos($textoLinha, $esperado) === false) {
                    $encontrouTodos = false;
                    break;
                }
            }

            if ($encontrouTodos) {
                return $tabela;
            }
        }

        throw new RuntimeException('Tabela não encontrada no modelo (textos esperados: ' . implode(', ', $textosEsperados) . ').');
    }

    public function localizarTabelaPorInicioDaPrimeiraLinha(string $textoInicial): DOMElement
    {
        foreach ($this->xpath->query('//w:tbl') as $tabela) {
            $primeiraLinha = $this->xpath->query('.//w:tr', $tabela)->item(0);
            if ($primeiraLinha === null) {
                continue;
            }

            if (mb_strtoupper(trim($this->textoDoNo($primeiraLinha))) === mb_strtoupper($textoInicial)) {
                return $tabela;
            }

            $celulas = $this->xpath->query('./w:tr[1]/w:tc', $tabela);
            if ($celulas->length > 0 && trim($this->textoDoNo($celulas->item(0))) === $textoInicial) {
                return $tabela;
            }
        }

        throw new RuntimeException("Tabela não encontrada no modelo (início esperado: {$textoInicial}).");
    }

    /**
     * @return DOMElement[] lista de `w:tr` diretamente dentro da tabela.
     */
    public function linhas(DOMElement $tabela): array
    {
        $linhas = [];
        foreach ($this->xpath->query('./w:tr', $tabela) as $linha) {
            $linhas[] = $linha;
        }

        return $linhas;
    }

    /**
     * @return DOMElement[] lista de `w:tc` diretamente dentro da linha.
     */
    public function celulas(DOMElement $linha): array
    {
        $celulas = [];
        foreach ($this->xpath->query('./w:tc', $linha) as $celula) {
            $celulas[] = $celula;
        }

        return $celulas;
    }

    public function definirTextoDaCelula(DOMElement $celula, string $texto): void
    {
        $rPrExistente = $this->xpath->query('.//w:r/w:rPr', $celula)->item(0);

        foreach ($this->xpath->query('./w:p', $celula) as $p) {
            $celula->removeChild($p);
        }

        $p = $this->dom->createElementNS(self::W_NS, 'w:p');
        $r = $this->dom->createElementNS(self::W_NS, 'w:r');

        if ($rPrExistente !== null) {
            $r->appendChild($rPrExistente->cloneNode(true));
        }

        $t = $this->dom->createElementNS(self::W_NS, 'w:t');
        $t->setAttribute('xml:space', 'preserve');
        $t->appendChild($this->dom->createTextNode($texto));

        $r->appendChild($t);
        $p->appendChild($r);
        $celula->appendChild($p);
    }

    public function textoDaCelula(DOMElement $celula): string
    {
        return $this->textoDoNo($celula);
    }

    public function definirTextoDisciplinaNaCelula(DOMElement $celula, string $texto): void
    {
        foreach ($this->xpath->query('./w:p', $celula) as $p) {
            $celula->removeChild($p);
        }

        $p = $this->dom->createElementNS(self::W_NS, 'w:p');

        $pPr = $this->dom->createElementNS(self::W_NS, 'w:pPr');
        $jc = $this->dom->createElementNS(self::W_NS, 'w:jc');
        $jc->setAttribute('w:val', 'center');
        $pPr->appendChild($jc);
        $p->appendChild($pPr);

        $r = $this->dom->createElementNS(self::W_NS, 'w:r');
        $rPr = $this->dom->createElementNS(self::W_NS, 'w:rPr');

        $color = $this->dom->createElementNS(self::W_NS, 'w:color');
        $color->setAttribute('w:val', '0000FF'); // azul
        $rPr->appendChild($color);

        $u = $this->dom->createElementNS(self::W_NS, 'w:u');
        $u->setAttribute('w:val', 'single');
        $rPr->appendChild($u);

        foreach (['w:sz', 'w:szCs'] as $tagTamanho) {
            $sz = $this->dom->createElementNS(self::W_NS, $tagTamanho);
            $sz->setAttribute('w:val', '18'); // 9pt = 18 half-points
            $rPr->appendChild($sz);
        }

        $r->appendChild($rPr);

        $t = $this->dom->createElementNS(self::W_NS, 'w:t');
        $t->setAttribute('xml:space', 'preserve');
        $t->appendChild($this->dom->createTextNode($texto));
        $r->appendChild($t);

        $p->appendChild($r);
        $celula->appendChild($p);
    }

    public function definirSombreadoLinha(DOMElement $linha, bool $comSombra, int $apartirDaCelula = 2): void
    {
        $celulas = array_slice($this->celulas($linha), $apartirDaCelula);

        foreach ($celulas as $celula) {
            $tcPr = $this->xpath->query('./w:tcPr', $celula)->item(0);
            if (!$tcPr instanceof DOMElement) {
                $tcPr = $this->dom->createElementNS(self::W_NS, 'w:tcPr');
                $celula->insertBefore($tcPr, $celula->firstChild);
            }

            $shd = $this->xpath->query('./w:shd', $tcPr)->item(0);
            if (!$shd instanceof DOMElement) {
                $shd = $this->dom->createElementNS(self::W_NS, 'w:shd');
                $shd->setAttribute('w:val', 'clear');
                $shd->setAttribute('w:color', 'auto');
                $tcPr->appendChild($shd);
            }

            if ($comSombra) {
                $shd->setAttribute('w:fill', '808080');
                $shd->setAttribute('w:themeFill', 'background1');
                $shd->setAttribute('w:themeFillShade', '80');
            } else {
                $shd->setAttribute('w:fill', 'auto');
                $shd->removeAttribute('w:themeFill');
                $shd->removeAttribute('w:themeFillShade');
            }
        }
    }

    public function removerLinha(DOMElement $linha): void
    {
        $linha->parentNode?->removeChild($linha);
    }

    private function textoDoNo(DOMElement $no): string
    {
        $textos = [];
        foreach ($this->xpath->query('.//w:t', $no) as $t) {
            $textos[] = $t->textContent;
        }

        return implode('', $textos);
    }
}