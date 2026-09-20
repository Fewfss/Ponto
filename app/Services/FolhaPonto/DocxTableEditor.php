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

            // A tabela de frequência tem "Dia" e "Semana" nas duas primeiras células.
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