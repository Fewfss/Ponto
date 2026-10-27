import { useEffect, useMemo, useRef, useState } from "react";
import { Head } from "@inertiajs/react";
import NavBar from "../components/items/NavBar.jsx";
import Modal from "../components/items/Modal.jsx";
import Filtro, { FILTRO_VAZIO } from "../components/items/Filtro.jsx";
import Toolbar from "../components/items/Toolbar.jsx";
import SearchBar from "../components/items/SearchBar.jsx";
import FilterButton from "../components/items/FilterButton.jsx";
import ActionButton from "../components/items/ActionButton.jsx";
import GradeDocumento from "../components/items/GradeDocumento.jsx";
import { IconImport, IconPen, IconFile } from "../components/items/Icons.jsx";
import { GRADES_INICIAIS, dataBR, totais, fmtNum } from "../data/gradesMock.js";
import "../components/styles/Grade.css";

const unicos = (lista) => [...new Set(lista)].filter(Boolean);

function Campo({ label, value, title }) {
    return (
        <span className={`gr-field ${title ? "gr-field--title" : ""}`}>
            <b>{label}</b>
            {value}
        </span>
    );
}

function GradeCard({ g, onVer, onEdit }) {
    const t = totais(g);
    const cursos = unicos(g.componentes.map((c) => c.curso)).join(", ");
    const disciplinas = g.componentes.map((c) => c.disciplina.replace(/\s*\(.*\)$/, "")).join(" · ");

    return (
        <article className="gr-card" aria-labelledby={`gr-titulo-${g.id}`}>
            <header className="gr-head">
                <h2 id={`gr-titulo-${g.id}`} className="gr-title">{g.nome}</h2>
                <span className="gr-semestre">
                    <small>Semestre</small>
                    {g.semestre}
                </span>
            </header>

            <div className="gr-info">
                <div className="gr-row">
                    <Campo label="Matrícula:" value={g.matricula} />
                    <Campo label="CPF:" value={g.cpf} />
                    <Campo label="Contrato:" value={g.contrato} />
                    <Campo label="Validade:" value={`${dataBR(g.validadeInicio)} a ${dataBR(g.validadeFim)}`} />
                </div>
                <div className="gr-row">
                    <Campo label="Disciplinas:" value={disciplinas} />
                    <Campo label="Curso(s):" value={cursos} />
                </div>
                <div className="gr-row gr-row--wide">
                    <Campo label="Hora-Aula Semanal:" value={t.semanal} />
                    <Campo label="Total Mensal:" value={fmtNum(t.total)} />
                    <Campo label="Aulas na semana:" value={g.aulas.length} />
                    <Campo label={g.unidade} title />
                </div>
            </div>

            <div className="gr-actions">
                <ActionButton variant="light" icon={<IconFile />} onClick={() => onVer(g.id)}
                              aria-label={`Ver grade de ${g.nome}`}>
                    Ver grade
                </ActionButton>
                <ActionButton icon={<IconPen />} onClick={() => onEdit(g)}
                              aria-label={`Editar grade de ${g.nome}`}>
                    Editar
                </ActionButton>
            </div>
        </article>
    );
}

/* ------------------------------------------------------------------
   Modal: ver grade (com navegação entre as grades listadas)
------------------------------------------------------------------- */
function ModalVer({ lista, indice, onMudar, onClose }) {
    const g = lista[indice];
    const corpoRef = useRef(null);

    // volta ao topo ao trocar de grade
    useEffect(() => {
        corpoRef.current?.closest(".modal-body")?.scrollTo({ top: 0 });
    }, [g?.id]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "ArrowLeft" && indice > 0 && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) onMudar(indice - 1);
            if (e.key === "ArrowRight" && indice < lista.length - 1 && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) onMudar(indice + 1);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [indice, lista.length, onMudar]);

    if (!g) return null;

    return (
        <Modal
            className="modal--wide"
            titulo={g.nome}
            descricao={`Grade horária · ${g.semestre} · Matrícula ${g.matricula}`}
            onClose={onClose}
            rodape={
                <>
                    <div className="gr-nav" role="group" aria-label="Navegar entre grades">
                        <ActionButton disabled={indice === 0} onClick={() => onMudar(indice - 1)} aria-label="Grade anterior">
                            ‹ Anterior
                        </ActionButton>
                        <span className="gr-nav-count" aria-live="polite">{indice + 1} de {lista.length}</span>
                        <ActionButton disabled={indice === lista.length - 1} onClick={() => onMudar(indice + 1)} aria-label="Próxima grade">
                            Próxima ›
                        </ActionButton>
                    </div>
                    <ActionButton variant="light" onClick={onClose}>Fechar</ActionButton>
                </>
            }
        >
            <div ref={corpoRef}>
                <GradeDocumento grade={g} />
            </div>
        </Modal>
    );
}

/* ------------------------------------------------------------------
   Modal: editar dados da grade / excluir
------------------------------------------------------------------- */
const CAMPOS_EDICAO = [
    { titulo: "Unidade", campos: [["unidade", "Unidade", "span3"]] },
    {
        titulo: "Professor(a)",
        campos: [
            ["nome", "Nome", "span2"], ["matricula", "Matrícula"],
            ["cpf", "CPF"], ["contrato", "Contrato"],
        ],
    },
    {
        titulo: "Vigência",
        campos: [
            ["semestre", "Semestre"],
            ["validadeInicio", "Validade início", "", "date"],
            ["validadeFim", "Validade fim", "", "date"],
        ],
    },
];

function ModalEditar({ grade, onSave, onDelete, onClose }) {
    const [form, setForm] = useState(grade);
    const [confirmando, setConfirmando] = useState(false);
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    return (
        <Modal
            titulo="Editar grade"
            descricao="Altere os dados do cabeçalho. As aulas vêm do PDF importado."
            onClose={onClose}
            rodape={
                <>
                    <ActionButton
                        className="gr-danger"
                        onClick={() => (confirmando ? onDelete(grade.id) : setConfirmando(true))}
                    >
                        {confirmando ? "Confirmar exclusão" : "Excluir grade"}
                    </ActionButton>
                    <span className="gr-foot-spacer" />
                    <ActionButton onClick={onClose}>Cancelar</ActionButton>
                    <ActionButton variant="light" onClick={() => onSave(form)}>Salvar alterações</ActionButton>
                </>
            }
        >
            {CAMPOS_EDICAO.map((grupo) => (
                <section className="form-group" key={grupo.titulo}>
                    <h3>{grupo.titulo}</h3>
                    <div className="form-grid">
                        {grupo.campos.map(([k, label, largura, tipo]) => (
                            <label key={k} className={largura}>
                                {label}
                                <input type={tipo || "text"} value={form[k]} onChange={set(k)} />
                            </label>
                        ))}
                    </div>
                </section>
            ))}
        </Modal>
    );
}

/* ------------------------------------------------------------------
   Modal: importar PDFs (demonstração — ainda não lê o arquivo)
------------------------------------------------------------------- */
function ModalImportar({ onConfirm, onClose }) {
    const [arquivos, setArquivos] = useState([]);
    const [arrastando, setArrastando] = useState(false);

    const adicionar = (fileList) => {
        const pdfs = [...fileList].filter((f) => /\.pdf$/i.test(f.name));
        setArquivos((atual) => [...atual, ...pdfs.filter((f) => !atual.some((a) => a.name === f.name))]);
    };

    return (
        <Modal
            titulo="Importar grades"
            descricao="Envie os PDFs semestrais — cada PDF é a grade de um professor."
            onClose={onClose}
            rodape={
                <>
                    <ActionButton onClick={onClose}>Cancelar</ActionButton>
                    <ActionButton variant="light" onClick={() => onConfirm(arquivos)} disabled={arquivos.length === 0}>
                        Importar {arquivos.length > 0 && `(${arquivos.length})`}
                    </ActionButton>
                </>
            }
        >
            <label
                className={`gr-drop ${arrastando ? "is-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(e) => { e.preventDefault(); setArrastando(false); adicionar(e.dataTransfer.files); }}
            >
                <IconImport />
                <strong>Arraste os PDFs aqui</strong>
                <span>ou clique para selecionar</span>
                <input type="file" accept="application/pdf,.pdf" multiple onChange={(e) => { adicionar(e.target.files); e.target.value = ""; }} />
            </label>

            {arquivos.length > 0 && (
                <ul className="gr-files" aria-label="Arquivos selecionados">
                    {arquivos.map((f) => (
                        <li key={f.name}>
                            <IconFile />
                            <span className="gr-files-nome">{f.name}</span>
                            <button type="button" aria-label={`Remover ${f.name}`}
                                    onClick={() => setArquivos((a) => a.filter((x) => x !== f))}>×</button>
                        </li>
                    ))}
                </ul>
            )}

            <p className="gr-aviso">Demonstração: a leitura dos PDFs será conectada ao back-end numa próxima etapa.</p>
        </Modal>
    );
}

/* ------------------------------------------------------------------
   Tela principal
------------------------------------------------------------------- */
export default function Grade() {
    const [grades, setGrades] = useState(GRADES_INICIAIS);
    const [busca, setBusca] = useState("");
    const [filtro, setFiltro] = useState(FILTRO_VAZIO);
    const [filtroAberto, setFiltroAberto] = useState(false);
    const [verId, setVerId] = useState(null);
    const [editando, setEditando] = useState(null);
    const [importando, setImportando] = useState(false);
    const [aviso, setAviso] = useState("");

    const opcoes = useMemo(() => ({
        semestres: unicos(grades.map((g) => g.semestre)),
        cursos: unicos(grades.flatMap((g) => g.componentes.map((c) => c.curso))),
        periodos: unicos(grades.flatMap((g) => g.componentes.map((c) => c.periodo))),
        statuses: unicos(grades.flatMap((g) => g.componentes.map((c) => c.status))),
    }), [grades]);

    const visiveis = useMemo(() => {
        const q = busca.trim().toLowerCase();
        return grades.filter((g) => {
            const texto = [
                g.nome, g.matricula, g.cpf, g.contrato, g.semestre, g.unidade,
                ...g.componentes.flatMap((c) => [c.disciplina, c.curso, c.periodo, c.status]),
            ].join(" ").toLowerCase();
            return (
                (!q || texto.includes(q)) &&
                (!filtro.semestre || g.semestre === filtro.semestre) &&
                (!filtro.curso || g.componentes.some((c) => c.curso === filtro.curso)) &&
                (!filtro.periodo || g.componentes.some((c) => c.periodo === filtro.periodo)) &&
                (!filtro.status || g.componentes.some((c) => c.status === filtro.status)) &&
                // vigência: a grade precisa cruzar o intervalo informado
                (!filtro.inicio || g.validadeFim >= filtro.inicio) &&
                (!filtro.fim || g.validadeInicio <= filtro.fim)
            );
        });
    }, [grades, busca, filtro]);

    const filtrosAtivos = Object.values(filtro).filter(Boolean).length;
    const indiceVer = visiveis.findIndex((g) => g.id === verId);

    const salvar = (nova) => {
        setGrades((gs) => gs.map((g) => (g.id === nova.id ? nova : g)));
        setEditando(null);
    };
    const excluir = (id) => {
        setGrades((gs) => gs.filter((g) => g.id !== id));
        setEditando(null);
        setAviso("Grade excluída (apenas nesta demonstração).");
    };
    const importar = (arquivos) => {
        setImportando(false);
        setAviso(`${arquivos.length} PDF(s) selecionado(s). A importação real será conectada ao back-end depois.`);
    };

    return (
        <div className="grade-page">
            <Head title="Grade horária" />
            <NavBar />

            <main id="conteudo" tabIndex={-1} className="grade-content">
                <Toolbar>
                    <SearchBar value={busca} onChange={(e) => setBusca(e.target.value)}
                               placeholder="Pesquise por professor, matrícula, disciplina.." />
                    <FilterButton count={filtrosAtivos} onClick={() => setFiltroAberto(true)} />
                    <ActionButton variant="light" icon={<IconImport />} onClick={() => setImportando(true)}>
                        Importar
                    </ActionButton>
                </Toolbar>

                {filtroAberto && (
                    <Filtro valores={filtro} opcoes={opcoes} onAplicar={setFiltro} onClose={() => setFiltroAberto(false)} />
                )}

                {aviso && (
                    <p className="gr-toast" role="status">
                        {aviso}
                        <button type="button" onClick={() => setAviso("")} aria-label="Dispensar aviso">×</button>
                    </p>
                )}

                {/* anuncia para leitores de tela quantas grades restaram após buscar/filtrar */}
                <p className="sr-only" role="status">
                    {visiveis.length} {visiveis.length === 1 ? "grade encontrada" : "grades encontradas"}
                </p>

                <section className="gr-list" aria-label="Grades">
                    {visiveis.map((g) => (
                        <GradeCard key={g.id} g={g} onVer={setVerId} onEdit={setEditando} />
                    ))}
                    {visiveis.length === 0 && (
                        <p className="gr-empty">Nenhuma grade encontrada. Ajuste a busca ou os filtros.</p>
                    )}
                </section>

                {indiceVer >= 0 && (
                    <ModalVer
                        lista={visiveis}
                        indice={indiceVer}
                        onMudar={(i) => setVerId(visiveis[i].id)}
                        onClose={() => setVerId(null)}
                    />
                )}
                {editando && (
                    <ModalEditar grade={editando} onSave={salvar} onDelete={excluir} onClose={() => setEditando(null)} />
                )}
                {importando && <ModalImportar onConfirm={importar} onClose={() => setImportando(false)} />}
            </main>
        </div>
    );
}
