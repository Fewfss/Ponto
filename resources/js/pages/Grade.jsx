import { useEffect, useRef, useState } from "react";
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
import useGrades from "../hooks/useGrades.js";
import { aplicarAlteracoes, gradesApi } from "../services/api.js";
import { alteracoes, dataBR, totais, fmtNum } from "../utils/grade.js";
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
   Helpers de formulário / erro
------------------------------------------------------------------- */
// Mensagem(ns) para exibir: validação (422) vira lista; o resto, a mensagem do erro.
const mensagensDoErro = (e) => (e?.detalhes?.length ? e.detalhes : [e?.message || "Algo deu errado. Tente novamente."]);

function ListaErros({ mensagens }) {
    if (!mensagens.length) return null;
    return (
        <div className="gr-erro" role="alert">
            {mensagens.map((m) => <p key={m}>{m}</p>)}
        </div>
    );
}

/* ------------------------------------------------------------------
   Modal: editar dados da grade / excluir
------------------------------------------------------------------- */
// A unidade vem do cabeçalho do PDF e o back não a guarda, por isso não é editável aqui.
const CAMPOS_EDICAO = [
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
    const [ocupado, setOcupado] = useState(false);
    const [erros, setErros] = useState([]);
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const executar = async (acao) => {
        setOcupado(true);
        setErros([]);
        try {
            await acao();
        } catch (e) {
            setErros(mensagensDoErro(e));
            setConfirmando(false);
            setOcupado(false);
        }
        // em caso de sucesso o pai fecha o modal (desmonta); não mexe no estado aqui
    };

    const salvar = () => {
        if (!form.nome.trim() || !form.matricula.trim()) {
            setErros(["Nome e matrícula são obrigatórios."]);
            return;
        }
        if (form.validadeInicio && form.validadeFim && form.validadeFim < form.validadeInicio) {
            setErros(["A validade fim não pode ser anterior à validade início."]);
            return;
        }
        executar(() => onSave(grade, form));
    };

    return (
        <Modal
            titulo="Editar grade"
            descricao="Altere os dados do cabeçalho. As aulas vêm do arquivo importado."
            onClose={ocupado ? () => {} : onClose}
            rodape={
                <>
                    <ActionButton
                        className="gr-danger"
                        disabled={ocupado}
                        onClick={() => (confirmando ? executar(() => onDelete(grade.id)) : setConfirmando(true))}
                    >
                        {confirmando ? "Confirmar exclusão" : "Excluir grade"}
                    </ActionButton>
                    <span className="gr-foot-spacer" />
                    <ActionButton disabled={ocupado} onClick={onClose}>Cancelar</ActionButton>
                    <ActionButton variant="light" disabled={ocupado} onClick={salvar}>
                        {ocupado ? "Salvando…" : "Salvar alterações"}
                    </ActionButton>
                </>
            }
        >
            <ListaErros mensagens={erros} />

            {CAMPOS_EDICAO.map((grupo) => (
                <section className="form-group" key={grupo.titulo}>
                    <h3>{grupo.titulo}</h3>
                    <div className="form-grid">
                        {grupo.campos.map(([k, label, largura, tipo]) => (
                            <label key={k} className={largura}>
                                {label}
                                <input type={tipo || "text"} value={form[k] ?? ""} onChange={set(k)} disabled={ocupado} />
                            </label>
                        ))}
                    </div>
                </section>
            ))}

            {confirmando && (
                <p className="gr-aviso">
                    Excluir remove esta grade, suas disciplinas e aulas. O cadastro do professor é mantido.
                </p>
            )}
        </Modal>
    );
}

/* ------------------------------------------------------------------
   Modal: importar grades (PDF/DOCX) — um POST /api/grades por arquivo
------------------------------------------------------------------- */
const ROTULO_ESTADO = { pendente: "Aguardando", enviando: "Enviando…", ok: "Importada", erro: "Falhou" };
const chaveArquivo = (f) => `${f.name}:${f.size}`;

function ModalImportar({ onImportado, onClose }) {
    const [arquivos, setArquivos] = useState([]);
    const [estados, setEstados] = useState({}); // chave → { estado, mensagem }
    const [arrastando, setArrastando] = useState(false);
    const [enviando, setEnviando] = useState(false);

    const estadoDe = (f) => estados[chaveArquivo(f)]?.estado ?? "pendente";
    const faltam = arquivos.filter((f) => estadoDe(f) !== "ok");
    const houveFalha = arquivos.some((f) => estadoDe(f) === "erro");

    const adicionar = (fileList) => {
        const validos = [...fileList].filter((f) => /\.(pdf|docx)$/i.test(f.name));
        setArquivos((atual) => [...atual, ...validos.filter((f) => !atual.some((a) => chaveArquivo(a) === chaveArquivo(f)))]);
    };

    const importar = async () => {
        setEnviando(true);
        let importadas = 0;

        // sequencial de propósito: cada arquivo dispara pdftotext/pdftohtml no servidor
        for (const f of faltam) {
            const chave = chaveArquivo(f);
            setEstados((e) => ({ ...e, [chave]: { estado: "enviando" } }));
            try {
                await gradesApi.importar(f);
                importadas += 1;
                setEstados((e) => ({ ...e, [chave]: { estado: "ok" } }));
            } catch (erro) {
                setEstados((e) => ({ ...e, [chave]: { estado: "erro", mensagem: mensagensDoErro(erro).join(" ") } }));
            }
        }

        setEnviando(false);
        if (importadas > 0) await onImportado(importadas, faltam.length - importadas);
    };

    return (
        <Modal
            titulo="Importar grades"
            descricao="Envie os arquivos semestrais (PDF ou DOCX) — cada arquivo é a grade de um professor."
            onClose={enviando ? () => {} : onClose}
            rodape={
                <>
                    <ActionButton disabled={enviando} onClick={onClose}>
                        {arquivos.length > 0 && faltam.length === 0 ? "Fechar" : "Cancelar"}
                    </ActionButton>
                    <ActionButton variant="light" onClick={importar} disabled={enviando || faltam.length === 0}>
                        {enviando
                            ? "Importando…"
                            : houveFalha
                                ? `Tentar novamente (${faltam.length})`
                                : `Importar${faltam.length > 0 ? ` (${faltam.length})` : ""}`}
                    </ActionButton>
                </>
            }
        >
            <label
                className={`gr-drop ${arrastando ? "is-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(e) => { e.preventDefault(); setArrastando(false); if (!enviando) adicionar(e.dataTransfer.files); }}
            >
                <IconImport />
                <strong>Arraste os arquivos aqui</strong>
                <span>ou clique para selecionar (PDF ou DOCX, até 10 MB cada)</span>
                <input
                    type="file"
                    accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    multiple
                    disabled={enviando}
                    onChange={(e) => { adicionar(e.target.files); e.target.value = ""; }}
                />
            </label>

            {arquivos.length > 0 && (
                <ul className="gr-files" aria-label="Arquivos selecionados" aria-live="polite">
                    {arquivos.map((f) => {
                        const { estado, mensagem } = estados[chaveArquivo(f)] ?? { estado: "pendente" };
                        return (
                            <li key={chaveArquivo(f)} className={`gr-file--${estado}`}>
                                <IconFile />
                                <span className="gr-files-corpo">
                                    <span className="gr-files-nome">{f.name}</span>
                                    <span className="gr-files-estado">
                                        {ROTULO_ESTADO[estado]}{estado === "erro" && mensagem ? `: ${mensagem}` : ""}
                                    </span>
                                </span>
                                <button type="button" aria-label={`Remover ${f.name}`}
                                        disabled={enviando || estado === "ok"}
                                        onClick={() => setArquivos((a) => a.filter((x) => x !== f))}>×</button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Modal>
    );
}

/* ------------------------------------------------------------------
   Tela principal
------------------------------------------------------------------- */
export default function Grade() {
    const { grades, setGrades, opcoes, status, erro, recarregar } = useGrades();
    const [busca, setBusca] = useState("");
    const [filtro, setFiltro] = useState(FILTRO_VAZIO);
    const [filtroAberto, setFiltroAberto] = useState(false);
    const [verId, setVerId] = useState(null);
    const [editando, setEditando] = useState(null);
    const [importando, setImportando] = useState(false);
    const [aviso, setAviso] = useState("");
    const ultimoFiltroSolicitado = useRef({ busca, filtro });

    const visiveis = grades;
    const filtrosDaTela = { q: busca.trim(), ...filtro };

    useEffect(() => {
        if (ultimoFiltroSolicitado.current.busca === busca && ultimoFiltroSolicitado.current.filtro === filtro) {
            return;
        }

        ultimoFiltroSolicitado.current = { busca, filtro };
        const timeout = setTimeout(() => {
            recarregar({ filtros: filtrosDaTela });
        }, 300);

        return () => clearTimeout(timeout);
    }, [busca, filtro, recarregar]);

    const filtrosAtivos = Object.values(filtro).filter(Boolean).length;
    const indiceVer = visiveis.findIndex((g) => g.id === verId);

    // Professor (PATCH /professores/{id}) e grade (PATCH /grades-horarias/{id}) são endpoints
    // separados: `alteracoes` calcula o que mudou e só isso é enviado.
    const salvar = async (original, form) => {
        const mudancas = alteracoes(original, form);
        if (!mudancas.professor && !mudancas.grade) {
            setEditando(null);
            return;
        }

        try {
            await aplicarAlteracoes(original, mudancas);
        } finally {
            // recarrega tudo (também em falha parcial): o professor pode ter várias grades na lista
            await recarregar({ silencioso: true, filtros: filtrosDaTela });
        }

        setEditando(null);
        setAviso("Alterações salvas.");
    };

    const excluir = async (id) => {
        await gradesApi.excluir(id);
        setGrades((gs) => gs.filter((g) => g.id !== id));
        setEditando(null);
        setAviso("Grade excluída.");
    };

    const aoImportar = async (importadas, falhas) => {
        const atualizou = await recarregar({ silencioso: true, filtros: filtrosDaTela });
        const plural = importadas === 1 ? "grade importada" : "grades importadas";
        setAviso(
            `${importadas} ${plural}.` +
            (falhas > 0 ? ` ${falhas} arquivo(s) falharam.` : "") +
            (atualizou ? "" : " Não foi possível atualizar a lista — recarregue a página.")
        );
        if (falhas === 0) setImportando(false);
    };

    const lista = (
        <>
            {visiveis.map((g) => (
                <GradeCard key={g.id} g={g} onVer={setVerId} onEdit={setEditando} />
            ))}
            {visiveis.length === 0 && (
                <p className="gr-empty">
                    {grades.length === 0
                        ? "Nenhuma grade importada ainda. Use o botão Importar para enviar a primeira."
                        : "Nenhuma grade encontrada. Ajuste a busca ou os filtros."}
                </p>
            )}
        </>
    );

    return (
        <div className="grade-page">
            <Head title="Grade horária" />
            <NavBar />

            <main id="conteudo" tabIndex={-1} className="grade-content" aria-busy={status === "carregando"}>
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

                {status === "ok" && (
                    // anuncia para leitores de tela quantas grades restaram após buscar/filtrar
                    <p className="sr-only" role="status">
                        {visiveis.length} {visiveis.length === 1 ? "grade encontrada" : "grades encontradas"}
                    </p>
                )}

                <section className="gr-list" aria-label="Grades">
                    {status === "carregando" && <p className="gr-empty" role="status">Carregando grades…</p>}

                    {status === "erro" && (
                        <div className="gr-empty gr-falha" role="alert">
                            <p>Não foi possível carregar as grades. {erro}</p>
                            <ActionButton variant="light" onClick={() => recarregar()}>Tentar de novo</ActionButton>
                        </div>
                    )}

                    {status === "ok" && lista}
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
                {importando && <ModalImportar onImportado={aoImportar} onClose={() => setImportando(false)} />}
            </main>
        </div>
    );
}
