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
import { aulasApi, aplicarAlteracoes, componentesApi, gradesApi } from "../services/api.js";
import { alteracoes, dataBR, DIAS, PERIODOS, totais, fmtNum } from "../utils/grade.js";
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
function ModalVer({ lista, indice, onMudar, onEditarConteudo, onClose }) {
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
                    <ActionButton onClick={() => onEditarConteudo(g)}>Editar disciplinas e aulas</ActionButton>
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
            descricao="Altere os dados do cabeçalho. Para corrigir disciplinas e aulas, use Ver grade."
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

const PERIODO_API = { Manhã: "manha", Tarde: "tarde", Noite: "noite" };

function ModalEditarConteudo({ grade, onSaved, onClose }) {
    const [componentes, setComponentes] = useState(grade.componentes);
    const [aulas, setAulas] = useState(grade.aulas);
    const [ocupado, setOcupado] = useState(false);
    const [erros, setErros] = useState([]);
    const [aviso, setAviso] = useState("");
    const [confirmandoExclusao, setConfirmandoExclusao] = useState(null);
    const proximoIdTemporario = useRef(-1);

    const alterarComponente = (id, campo, valor) => {
        setComponentes((lista) => lista.map((componente) =>
            componente.id === id ? { ...componente, [campo]: valor } : componente
        ));
        setErros([]);
        setAviso("");
    };

    const alterarAula = (id, campo, valor) => {
        setAulas((lista) => lista.map((aula) =>
            aula.id === id ? { ...aula, [campo]: valor } : aula
        ));
        setErros([]);
        setAviso("");
    };

    const adicionarComponente = () => {
        setComponentes((lista) => [...lista, {
            id: proximoIdTemporario.current--,
            disciplina: "",
            curso: "",
            periodo: "Manhã",
            status: "",
            qtde: "0",
        }]);
        setErros([]);
        setAviso("");
    };

    const adicionarAula = () => {
        const componentesSalvos = componentes.filter((componente) => componente.id > 0);
        if (componentesSalvos.length === 0) {
            setErros(["Salve uma disciplina antes de adicionar aulas."]);
            return;
        }

        setAulas((lista) => [...lista, {
            id: proximoIdTemporario.current--,
            componenteId: componentesSalvos[0].id,
            dia: "segunda",
            periodo: "Manhã",
            inicio: "08:00",
            fim: "09:00",
            codigoOp: "",
        }]);
        setErros([]);
        setAviso("");
    };

    const salvarComponente = async (componente) => {
        const quantidade = Number(componente.qtde);
        const periodo = PERIODO_API[componente.periodo];
        const novo = componente.id < 0;

        if (!componente.disciplina.trim()) {
            setErros(["O nome da disciplina é obrigatório."]);
            return;
        }
        if (!Number.isInteger(quantidade) || quantidade < 0) {
            setErros(["A quantidade de aulas deve ser um número inteiro igual ou maior que zero."]);
            return;
        }
        if (!periodo) {
            setErros(["Selecione um período válido para a disciplina."]);
            return;
        }

        setOcupado(true);
        setErros([]);
        setAviso("");
        try {
            const dados = {
                disciplina: componente.disciplina.trim(),
                curso: componente.curso.trim() || null,
                periodo,
                status: componente.status.trim() || null,
                quantidade_aulas: quantidade,
            };
            const salvo = novo
                ? await componentesApi.criar({ grade_horaria_id: grade.id, ...dados })
                : await componentesApi.atualizar(componente.id, dados);

            if (novo) {
                setComponentes((lista) => lista.map((item) =>
                    item.id === componente.id ? { ...item, id: salvo.id } : item
                ));
            }

            setAviso(novo ? "Disciplina adicionada." : "Disciplina salva.");
            await onSaved();
        } catch (erro) {
            setErros(mensagensDoErro(erro));
        } finally {
            setOcupado(false);
        }
    };

    const excluirComponente = async (componente) => {
        if (componente.id < 0) {
            setComponentes((lista) => lista.filter((item) => item.id !== componente.id));
            setAviso("Rascunho de disciplina removido.");
            setConfirmandoExclusao(null);
            return;
        }

        setOcupado(true);
        setErros([]);
        setAviso("");
        try {
            await componentesApi.excluir(componente.id);
            const aulasRemovidas = aulas.filter((aula) => aula.componenteId === componente.id).length;
            setComponentes((lista) => lista.filter((item) => item.id !== componente.id));
            setAulas((lista) => lista.filter((aula) => aula.componenteId !== componente.id));
            setConfirmandoExclusao(null);
            setAviso(aulasRemovidas > 0
                ? `Disciplina e ${aulasRemovidas} aula(s) associada(s) removidas.`
                : "Disciplina removida.");
            await onSaved();
        } catch (erro) {
            setErros(mensagensDoErro(erro));
        } finally {
            setOcupado(false);
        }
    };

    const excluirAula = async (aula) => {
        if (aula.id < 0) {
            setAulas((lista) => lista.filter((item) => item.id !== aula.id));
            setAviso("Rascunho de aula removido.");
            setConfirmandoExclusao(null);
            return;
        }

        setOcupado(true);
        setErros([]);
        setAviso("");
        try {
            await aulasApi.excluir(aula.id);
            setAulas((lista) => lista.filter((item) => item.id !== aula.id));
            setConfirmandoExclusao(null);
            setAviso("Aula removida.");
            await onSaved();
        } catch (erro) {
            setErros(mensagensDoErro(erro));
        } finally {
            setOcupado(false);
        }
    };

    const salvarAula = async (aula) => {
        const periodo = PERIODO_API[aula.periodo];
        const novo = aula.id < 0;

        if (!aula.componenteId || !periodo || !aula.dia || !aula.inicio || !aula.fim || aula.fim <= aula.inicio) {
            setErros(["Confira a disciplina, o dia, o período e os horários da aula."]);
            return;
        }

        setOcupado(true);
        setErros([]);
        setAviso("");
        try {
            const dados = {
                componente_curricular_id: Number(aula.componenteId),
                dia_semana: aula.dia,
                periodo,
                hora_inicio: aula.inicio,
                hora_fim: aula.fim,
                codigo_op: aula.codigoOp.trim() || null,
            };
            const salva = novo
                ? await aulasApi.criar({ grade_horaria_id: grade.id, ...dados })
                : await aulasApi.atualizar(aula.id, dados);

            if (novo) {
                setAulas((lista) => lista.map((item) =>
                    item.id === aula.id ? { ...item, id: salva.id } : item
                ));
            }

            setAviso(novo ? "Aula adicionada." : "Aula salva.");
            await onSaved();
        } catch (erro) {
            setErros(mensagensDoErro(erro));
        } finally {
            setOcupado(false);
        }
    };

    return (
        <Modal
            className="modal--wide"
            titulo={`Editar disciplinas e aulas — ${grade.nome}`}
            descricao="Adicione, edite ou remova disciplinas e aulas. Excluir uma disciplina também remove suas aulas."
            onClose={ocupado ? () => {} : onClose}
            rodape={<ActionButton disabled={ocupado} onClick={onClose}>Fechar</ActionButton>}
        >
            <ListaErros mensagens={erros} />
            {aviso && <p className="gr-aviso" role="status">{aviso}</p>}

            <section className="gr-editor-section">
                <div className="gr-editor-heading">
                    <h3>Disciplinas e cursos</h3>
                    <ActionButton variant="light" disabled={ocupado} onClick={adicionarComponente}>
                        Adicionar disciplina
                    </ActionButton>
                </div>
                {componentes.length === 0 && <p className="gr-aviso">Esta grade não tem disciplinas cadastradas.</p>}
                {componentes.map((componente) => (
                    <article className="gr-editor-card" key={componente.id}>
                        <div className="form-grid">
                            <label className="span2">
                                Disciplina
                                <input value={componente.disciplina} onChange={(e) => alterarComponente(componente.id, "disciplina", e.target.value)} disabled={ocupado} />
                            </label>
                            <label className="span2">
                                Curso
                                <input value={componente.curso} onChange={(e) => alterarComponente(componente.id, "curso", e.target.value)} disabled={ocupado} />
                            </label>
                            <label>
                                Período
                                <select value={componente.periodo} onChange={(e) => alterarComponente(componente.id, "periodo", e.target.value)} disabled={ocupado}>
                                    {PERIODOS.map((periodo) => <option key={periodo.id} value={periodo.id}>{periodo.label}</option>)}
                                </select>
                            </label>
                            <label>
                                Status
                                <input value={componente.status} onChange={(e) => alterarComponente(componente.id, "status", e.target.value)} disabled={ocupado} />
                            </label>
                            <label>
                                Quantidade de aulas
                                <input type="number" min="0" step="1" value={componente.qtde} onChange={(e) => alterarComponente(componente.id, "qtde", e.target.value)} disabled={ocupado} />
                            </label>
                        </div>
                        {confirmandoExclusao === `componente-${componente.id}` ? (
                            <div className="gr-editor-confirm">
                                <span>
                                    {aulas.filter((aula) => aula.componenteId === componente.id).length > 0
                                        ? "A disciplina e suas aulas vinculadas serão removidas."
                                        : "Esta disciplina será removida."}
                                </span>
                                <ActionButton className="gr-danger" disabled={ocupado} onClick={() => excluirComponente(componente)}>
                                    Confirmar exclusão
                                </ActionButton>
                                <ActionButton disabled={ocupado} onClick={() => setConfirmandoExclusao(null)}>
                                    Cancelar
                                </ActionButton>
                            </div>
                        ) : (
                            <div className="gr-editor-actions">
                                <ActionButton variant="light" disabled={ocupado} onClick={() => salvarComponente(componente)}>
                                    {componente.id < 0 ? "Adicionar disciplina" : "Salvar disciplina"}
                                </ActionButton>
                                <ActionButton
                                    className="gr-danger"
                                    disabled={ocupado}
                                    onClick={() => componente.id < 0
                                        ? excluirComponente(componente)
                                        : setConfirmandoExclusao(`componente-${componente.id}`)}
                                >
                                    {componente.id < 0 ? "Descartar rascunho" : "Excluir disciplina"}
                                </ActionButton>
                            </div>
                        )}
                    </article>
                ))}
            </section>

            <section className="gr-editor-section">
                <div className="gr-editor-heading">
                    <h3>Aulas</h3>
                    <ActionButton
                        variant="light"
                        disabled={ocupado || !componentes.some((componente) => componente.id > 0)}
                        onClick={adicionarAula}
                    >
                        Adicionar aula
                    </ActionButton>
                </div>
                {aulas.length === 0 && <p className="gr-aviso">Esta grade não tem aulas cadastradas.</p>}
                {aulas.map((aula) => (
                    <article className="gr-editor-card" key={aula.id}>
                        <div className="form-grid">
                            <label className="span2">
                                Disciplina
                                <select value={aula.componenteId ?? ""} onChange={(e) => alterarAula(aula.id, "componenteId", e.target.value)} disabled={ocupado}>
                                    <option value="">Selecione</option>
                                    {componentes.filter((componente) => componente.id > 0).map((componente) => (
                                        <option key={componente.id} value={componente.id}>{componente.disciplina}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Dia
                                <select value={aula.dia} onChange={(e) => alterarAula(aula.id, "dia", e.target.value)} disabled={ocupado}>
                                    {DIAS.map((dia) => <option key={dia.id} value={dia.id}>{dia.label}</option>)}
                                </select>
                            </label>
                            <label>
                                Período
                                <select value={aula.periodo} onChange={(e) => alterarAula(aula.id, "periodo", e.target.value)} disabled={ocupado}>
                                    {PERIODOS.map((periodo) => <option key={periodo.id} value={periodo.id}>{periodo.label}</option>)}
                                </select>
                            </label>
                            <label>
                                Início
                                <input type="time" value={aula.inicio} onChange={(e) => alterarAula(aula.id, "inicio", e.target.value)} disabled={ocupado} />
                            </label>
                            <label>
                                Fim
                                <input type="time" value={aula.fim} onChange={(e) => alterarAula(aula.id, "fim", e.target.value)} disabled={ocupado} />
                            </label>
                            <label>
                                Código OP
                                <input value={aula.codigoOp} onChange={(e) => alterarAula(aula.id, "codigoOp", e.target.value)} disabled={ocupado} />
                            </label>
                        </div>
                        {confirmandoExclusao === `aula-${aula.id}` ? (
                            <div className="gr-editor-confirm">
                                <span>Esta aula será removida.</span>
                                <ActionButton className="gr-danger" disabled={ocupado} onClick={() => excluirAula(aula)}>
                                    Confirmar exclusão
                                </ActionButton>
                                <ActionButton disabled={ocupado} onClick={() => setConfirmandoExclusao(null)}>
                                    Cancelar
                                </ActionButton>
                            </div>
                        ) : (
                            <div className="gr-editor-actions">
                                <ActionButton variant="light" disabled={ocupado} onClick={() => salvarAula(aula)}>
                                    {aula.id < 0 ? "Adicionar aula" : "Salvar aula"}
                                </ActionButton>
                                <ActionButton
                                    className="gr-danger"
                                    disabled={ocupado}
                                    onClick={() => aula.id < 0
                                        ? excluirAula(aula)
                                        : setConfirmandoExclusao(`aula-${aula.id}`)}
                                >
                                    {aula.id < 0 ? "Descartar rascunho" : "Excluir aula"}
                                </ActionButton>
                            </div>
                        )}
                    </article>
                ))}
            </section>
        </Modal>
    );
}

/* ------------------------------------------------------------------
   Modal: importar grades (PDF/DOCX) — um POST /api/grades por arquivo
------------------------------------------------------------------- */
const ROTULO_ESTADO = { pendente: "Na fila", enviando: "Importando…", ok: "Importada", erro: "Falhou" };
const chaveArquivo = (f) => `${f.name}:${f.size}`;

function ModalImportar({ onImportado, onClose }) {
    const [arquivos, setArquivos] = useState([]);
    const [estados, setEstados] = useState({}); // chave → { estado, mensagem }
    const [arrastando, setArrastando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [progresso, setProgresso] = useState(null);
    const inputRef = useRef(null);

    const estadoDe = (f) => estados[chaveArquivo(f)]?.estado ?? "pendente";
    const faltam = arquivos.filter((f) => estadoDe(f) !== "ok");
    const quantidadeFaltante = `${faltam.length} ${faltam.length === 1 ? "grade" : "grades"}`;
    const houveFalha = arquivos.some((f) => estadoDe(f) === "erro");

    const adicionar = (fileList) => {
        const validos = [...fileList].filter((f) => /\.(pdf|docx)$/i.test(f.name));
        setArquivos((atual) => [...atual, ...validos.filter((f) => !atual.some((a) => chaveArquivo(a) === chaveArquivo(f)))]);
    };

    const importar = async () => {
        setEnviando(true);
        let importadas = 0;

        // sequencial de propósito: cada arquivo dispara pdftotext/pdftohtml no servidor
        for (const [indice, f] of faltam.entries()) {
            const chave = chaveArquivo(f);
            setProgresso({ atual: indice + 1, total: faltam.length, nome: f.name });
            setEstados((e) => ({ ...e, [chave]: { estado: "enviando" } }));
            try {
                await gradesApi.importar(f);
                importadas += 1;
                setEstados((e) => ({ ...e, [chave]: { estado: "ok" } }));
            } catch (erro) {
                setEstados((e) => ({ ...e, [chave]: { estado: "erro", mensagem: mensagensDoErro(erro).join(" ") } }));
            }
        }

        setProgresso(null);
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
                                ? `Tentar novamente (${quantidadeFaltante})`
                                : faltam.length > 0
                                    ? `Importar ${quantidadeFaltante}`
                                    : "Importar grades"}
                    </ActionButton>
                </>
            }
        >
            <div
                className={`gr-drop ${arrastando ? "is-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(e) => { e.preventDefault(); setArrastando(false); if (!enviando) adicionar(e.dataTransfer.files); }}
            >
                <IconImport />
                <strong>Adicione as grades para importar</strong>
                <span>Arraste arquivos aqui ou selecione vários PDFs ou DOCX (até 10 MB cada).</span>
                <ActionButton
                    type="button"
                    disabled={enviando}
                    onClick={() => inputRef.current?.click()}
                >
                    Adicionar arquivos
                </ActionButton>
                <input
                    ref={inputRef}
                    className="gr-file-input"
                    type="file"
                    accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    multiple
                    disabled={enviando}
                    onChange={(e) => { adicionar(e.target.files); e.target.value = ""; }}
                />
            </div>

            {progresso && (
                <p className="gr-aviso" role="status">
                    Importando arquivo {progresso.atual} de {progresso.total}: {progresso.nome}
                </p>
            )}

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
    const [editandoConteudo, setEditandoConteudo] = useState(null);
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

    const editarConteudo = (grade) => {
        setVerId(null);
        setEditandoConteudo(grade);
    };

    const salvarConteudo = async () => {
        const atualizou = await recarregar({ silencioso: true, filtros: filtrosDaTela });
        if (!atualizou) setAviso("As alterações foram salvas, mas não foi possível atualizar a lista.");
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
                        onEditarConteudo={editarConteudo}
                        onClose={() => setVerId(null)}
                    />
                )}
                {editando && (
                    <ModalEditar grade={editando} onSave={salvar} onDelete={excluir} onClose={() => setEditando(null)} />
                )}
                {editandoConteudo && (
                    <ModalEditarConteudo
                        grade={editandoConteudo}
                        onSaved={salvarConteudo}
                        onClose={() => setEditandoConteudo(null)}
                    />
                )}
                {importando && <ModalImportar onImportado={aoImportar} onClose={() => setImportando(false)} />}
            </main>
        </div>
    );
}
