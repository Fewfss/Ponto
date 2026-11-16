import { useEffect, useMemo, useRef, useState } from "react";
import { Head } from "@inertiajs/react";
import NavBar from "../components/items/NavBar.jsx";
import Modal from "../components/items/Modal.jsx";
import Filtro, { FILTRO_VAZIO } from "../components/items/Filtro.jsx";
import Toolbar from "../components/items/Toolbar.jsx";
import SearchBar from "../components/items/SearchBar.jsx";
import FilterButton from "../components/items/FilterButton.jsx";
import ActionButton from "../components/items/ActionButton.jsx";
import { IconNewDoc, IconPen } from "../components/items/Icons.jsx";
import useGrades from "../hooks/useGrades.js";
import { aplicarAlteracoes, folhasApi } from "../services/api.js";
import { alteracoes, dataBR, FOLHA_FIXOS, MESES } from "../utils/grade.js";
import "../components/styles/Folha.css";

/* campos do formulário de edição, agrupados: [chave, rótulo, largura ("span2" | "span3")]
   Unidade, cidade, COD e comprovantes são texto fixo do modelo .docx, por isso não são editáveis. */
const GRUPOS = [
  { titulo: "Professor(a)", campos: [
    ["nome", "Professor(a)", "span2"], ["matricula", "Matrícula"],
    ["contrato", "Regime Jurídico"], ["categoria", "Categoria"],
  ]},
  { titulo: "Carga horária", campos: [
    ["horaAulaSemanal", "Hora-Aula Semanal"], ["horaAtividade", "Hora Atividade"],
    ["haeProjeto", "HAE (Projeto/Orientação)"], ["haeCoordenacao", "HAE (Coordenação)"],
  ]},
];

// Mensagem(ns) para exibir: validação (422) vira lista; o resto, a mensagem do erro.
const mensagensDoErro = (e) => (e?.detalhes?.length ? e.detalhes : [e?.message || "Algo deu errado. Tente novamente."]);

function ListaErros({ mensagens }) {
  if (!mensagens.length) return null;
  return (
    <div className="fp-erro" role="alert">
      {mensagens.map((m) => <p key={m}>{m}</p>)}
    </div>
  );
}

/* ------------------------------------------------------------------
   Card da grade
------------------------------------------------------------------- */
function Campo({ label, value, title }) {
  return (
    <span className={`fp-field ${title ? "fp-field--title" : ""}`}>
      <b>{label}</b>
      {value}
    </span>
  );
}

const ou = (v) => v || "—";

function GradeCard({ g, selecionada, onSelect, onEdit }) {
  const disciplinas = [...new Set(g.componentes.map((c) => c.disciplina.replace(/\s*\(.*\)$/, "")))].join(" · ");
  const cursos = [...new Set(g.componentes.map((c) => c.curso).filter(Boolean))].join(", ");

  return (
    <article
      className="fp-card"
      tabIndex={0}
      aria-current={selecionada ? "true" : undefined}
      aria-label={`Grade de ${g.nome}, semestre ${g.semestre || "sem semestre"}`}
      onClick={() => onSelect(g.id)}
      onKeyDown={(e) => {
        // Enter/Espaço selecionam, mas só quando o foco está no card (não nos botões dentro dele)
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect(g.id);
        }
      }}
    >
      <ActionButton
        variant="light"
        className="fp-edit"
        icon={<IconPen />}
        onClick={(e) => { e.stopPropagation(); onEdit(g); }}
      >
        Editar
      </ActionButton>

      <div className="fp-row">
        <Campo label={FOLHA_FIXOS.unidade} title />
        <Campo label="Cidade:" value={FOLHA_FIXOS.cidade} />
        <Campo label="COD:" value={FOLHA_FIXOS.cod} />
      </div>
      <div className="fp-row">
        <Campo label="Professor(a):" value={g.nome} />
        <Campo label="Matrícula:" value={ou(g.matricula)} />
        <Campo label="Regime Jurídico:" value={ou(g.contrato)} />
        <Campo label="Categoria:" value={ou(g.categoria)} />
      </div>
      <div className="fp-row">
        <Campo label="Semestre:" value={ou(g.semestre)} />
        <Campo label="Vigência:" value={`${dataBR(g.validadeInicio)} a ${dataBR(g.validadeFim)}`} />
      </div>
      <div className="fp-row">
        <Campo label="Disciplinas:" value={ou(disciplinas)} />
        <Campo label="Curso(s):" value={ou(cursos)} />
      </div>
      <div className="fp-row">
        <Campo label="Comprovante(s) Curricular(es)" value={FOLHA_FIXOS.comprovantes} />
        <Campo label="Hora-Aula Semanal:" value={ou(g.horaAulaSemanal)} />
        <Campo label="Hora Atividade:" value={ou(g.horaAtividade)} />
      </div>
      <div className="fp-row fp-row--wide">
        <Campo label="HAE (Projeto/Orientação):" value={ou(g.haeProjeto)} />
        <Campo label="HAE (Coordenação):" value={ou(g.haeCoordenacao)} />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------
   Modal: editar grade (cabeçalho que entra na folha)
------------------------------------------------------------------- */
function ModalEditar({ grade, onSave, onClose }) {
  const [form, setForm] = useState(grade);
  const [ocupado, setOcupado] = useState(false);
  const [erros, setErros] = useState([]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const salvar = async () => {
    if (!form.nome.trim() || !form.matricula.trim()) {
      setErros(["Nome e matrícula são obrigatórios."]);
      return;
    }
    setOcupado(true);
    setErros([]);
    try {
      await onSave(grade, form); // em caso de sucesso o pai fecha o modal
    } catch (e) {
      setErros(mensagensDoErro(e));
      setOcupado(false);
    }
  };

  return (
    <Modal
      titulo="Editar grade"
      onClose={ocupado ? () => {} : onClose}
      rodape={
        <>
          <ActionButton disabled={ocupado} onClick={onClose}>Cancelar</ActionButton>
          <ActionButton variant="light" disabled={ocupado} onClick={salvar}>
            {ocupado ? "Salvando…" : "Salvar alterações"}
          </ActionButton>
        </>
      }
    >
      <ListaErros mensagens={erros} />
      {GRUPOS.map((grupo) => (
        <section className="form-group" key={grupo.titulo}>
          <h3>{grupo.titulo}</h3>
          <div className="form-grid">
            {grupo.campos.map(([k, label, largura]) => (
              <label key={k} className={largura}>
                {label}
                <input value={form[k] ?? ""} onChange={set(k)} disabled={ocupado} />
              </label>
            ))}
          </div>
        </section>
      ))}
    </Modal>
  );
}

const STATUS_GERACAO = {
  fila: "Na fila",
  gerando: "Gerando…",
  pronta: "Pronta",
  erro: "Falhou",
};
const MAX_FOLHAS_POR_ZIP = 100;

function ModalGerar({ grades, gradeInicial, onClose }) {
  const hoje = new Date();
  const gradeInicialValida = grades.find((grade) => grade.id === gradeInicial);
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [formato, setFormato] = useState("docx");
  const [buscaProfessor, setBuscaProfessor] = useState("");
  const [selecionados, setSelecionados] = useState(() => (
    gradeInicialValida
      ? { [gradeInicialValida.professorId]: gradeInicialValida.id }
      : {}
  ));
  const [gerando, setGerando] = useState(false);
  const [erros, setErros] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [progresso, setProgresso] = useState(null);
  const [pdfDisponivel, setPdfDisponivel] = useState(null);
  const [erroDisponibilidadePdf, setErroDisponibilidadePdf] = useState("");

  const professores = useMemo(() => {
    const porId = new Map();

    grades.forEach((grade) => {
      if (!porId.has(grade.professorId)) {
        porId.set(grade.professorId, {
          id: grade.professorId,
          nome: grade.nome,
          matricula: grade.matricula,
          grades: [],
        });
      }

      porId.get(grade.professorId).grades.push(grade);
    });

    return [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [grades]);

  const professoresVisiveis = useMemo(() => {
    const termo = buscaProfessor.trim().toLocaleLowerCase("pt-BR");

    return professores.filter((professor) =>
      `${professor.nome} ${professor.matricula}`.toLocaleLowerCase("pt-BR").includes(termo)
    );
  }, [professores, buscaProfessor]);

  const selecionadosVisiveis = professoresVisiveis.length > 0
    && professoresVisiveis.every((professor) => selecionados[professor.id] !== undefined);
  const falhas = resultados.filter((resultado) => resultado.status === "erro");
  const prontas = resultados.filter((resultado) => resultado.status === "pronta" && resultado.folhaId);

  useEffect(() => {
    let ativo = true;

    folhasApi.capacidades()
      .then(({ pdf_disponivel: disponivel }) => {
        if (typeof disponivel !== "boolean") {
          throw new Error("Resposta inválida ao consultar os formatos disponíveis.");
        }

        if (ativo) setPdfDisponivel(disponivel);
      })
      .catch((erro) => {
        if (ativo) setErroDisponibilidadePdf(erro.message);
      });

    return () => { ativo = false; };
  }, []);

  const alterar = (setter) => (e) => {
    setter(e.target.value);
    setErros([]);
    setResultados([]);
  };

  const alternarProfessor = (professor, marcado) => {
    setSelecionados((atuais) => {
      const novos = { ...atuais };

      if (marcado) {
        novos[professor.id] = professor.grades[0].id;
      } else {
        delete novos[professor.id];
      }

      return novos;
    });
    setErros([]);
    setResultados([]);
  };

  const selecionarVisiveis = () => {
    setSelecionados((atuais) => {
      const novos = { ...atuais };

      professoresVisiveis.forEach((professor) => {
        if (selecionadosVisiveis) {
          delete novos[professor.id];
        } else if (novos[professor.id] === undefined) {
          novos[professor.id] = professor.grades[0].id;
        }
      });

      return novos;
    });
    setResultados([]);
  };

  const alterarGradeProfessor = (professorId, gradeId) => {
    setSelecionados((atuais) => ({ ...atuais, [professorId]: Number(gradeId) }));
    setResultados([]);
  };

  const montarFila = () => {
    const fila = Object.entries(selecionados).map(([professorId, gradeId]) => {
      const professor = professores.find((item) => item.id === Number(professorId));
      const grade = professor?.grades.find((item) => item.id === Number(gradeId));

      if (!professor || !grade) {
        return null;
      }

      return {
        professorId: professor.id,
        gradeId: grade.id,
        nome: professor.nome,
        matricula: professor.matricula,
        semestre: grade.semestre,
        status: "fila",
      };
    });

    if (fila.some((item) => item === null)) {
      setErros(["Uma ou mais grades selecionadas não estão disponíveis. Feche e abra a seleção novamente."]);
      return [];
    }

    return fila;
  };

  const processarFila = async (fila, novaGeracao = false) => {
    if (novaGeracao) {
      setResultados(fila);
    }

    setGerando(true);
    setErros([]);

    try {
      for (const [indice, item] of fila.entries()) {
        setProgresso({ atual: indice + 1, total: fila.length, nome: item.nome });
        setResultados((atuais) => atuais.map((resultado) =>
          resultado.professorId === item.professorId
            ? { ...resultado, status: "gerando", erro: "" }
            : resultado
        ));

        try {
          const { folha_ponto: folhaPonto, download_url: url } = await folhasApi.gerar(item.professorId, {
            mes: Number(mes),
            ano: Number(ano),
            grade_horaria_id: item.gradeId,
            formato,
          });
          setResultados((atuais) => atuais.map((resultado) =>
            resultado.professorId === item.professorId
              ? { ...resultado, status: "pronta", url, folhaId: folhaPonto.id }
              : resultado
          ));
        } catch (erro) {
          const mensagem = formato === "pdf"
            ? "Não foi possível gerar esta folha em PDF. Tente novamente ou escolha Word (.docx)."
            : mensagensDoErro(erro).join(" ");

          setResultados((atuais) => atuais.map((resultado) =>
            resultado.professorId === item.professorId
              ? { ...resultado, status: "erro", erro: mensagem }
              : resultado
          ));
        }
      }
    } finally {
      setGerando(false);
      setProgresso(null);
    }
  };

  const gerar = async () => {
    const anoNumerico = Number(ano);

    if (!Number.isInteger(anoNumerico) || anoNumerico < 2000 || anoNumerico > 2100) {
      setErros(["Informe um ano entre 2000 e 2100."]);
      return;
    }
    if (Object.keys(selecionados).length === 0) {
      setErros(["Selecione ao menos um professor."]);
      return;
    }

    const fila = montarFila();
    if (fila.length > 0) {
      await processarFila(fila, true);
    }
  };

  const tentarFalhas = () => {
    const fila = falhas.map(({ erro, url, status, ...item }) => ({ ...item, status: "fila" }));
    processarFila(fila);
  };

  const nomeFormato = formato === "pdf" ? "PDF" : "Word (.docx)";

  return (
    <Modal
      titulo={resultados.length > 0 ? "Resultado da geração" : "Gerar folhas de ponto"}
      descricao={resultados.length > 0
        ? "Confira o status e baixe cada folha gerada."
        : "Selecione os professores e escolha o mês de referência."}
      onClose={gerando ? () => {} : onClose}
      rodape={
        <>
          <ActionButton disabled={gerando} onClick={onClose}>
            {resultados.length > 0 ? "Concluir" : "Fechar"}
          </ActionButton>
          {resultados.length === 0 && (
            <ActionButton variant="light" disabled={gerando || grades.length === 0} onClick={gerar}>
              {gerando ? "Gerando…" : "Gerar folhas"}
            </ActionButton>
          )}
          {resultados.length > 0 && falhas.length > 0 && (
            <ActionButton variant="light" disabled={gerando} onClick={tentarFalhas}>
              {gerando ? "Gerando…" : `Tentar novamente (${falhas.length})`}
            </ActionButton>
          )}
        </>
      }
    >
      {grades.length === 0 ? (
        <p className="fp-hint">Nenhuma grade disponível com a busca e os filtros atuais. Ajuste-os ou importe uma grade na tela de Grade.</p>
      ) : resultados.length > 0 ? (
        <section className="fp-batch-result" aria-label="Resultados das folhas">
          <p className="fp-batch-summary">
            Competência: <b>{MESES[Number(mes) - 1]}/{ano}</b> · Formato: <b>{nomeFormato}</b>
          </p>
          {progresso && (
            <p className="fp-hint" role="status">
              Gerando folha {progresso.atual} de {progresso.total}: {progresso.nome}
            </p>
          )}
          <ul className="fp-batch-list">
            {resultados.map((resultado) => (
              <li className={`fp-batch-item fp-batch-item--${resultado.status}`} key={resultado.professorId}>
                <div>
                  <strong>{resultado.nome}</strong>
                  <span>Matrícula: {resultado.matricula || "—"} · Grade: {resultado.semestre || "sem semestre"}</span>
                  <span className="fp-batch-status">{STATUS_GERACAO[resultado.status]}</span>
                  {resultado.erro && <span className="fp-batch-error">{resultado.erro}</span>}
                </div>
                {resultado.status === "pronta" && (
                  <a className="action-btn action-btn--light fp-download" href={resultado.url} download>
                    Baixar folha
                  </a>
                )}
              </li>
            ))}
          </ul>
          {!gerando && prontas.length > 0 && (
            <div className="fp-batch-downloads">
              {prontas.length <= MAX_FOLHAS_POR_ZIP ? (
                <form method="post" action="/api/folhas-ponto/download-zip" className="fp-batch-zip-form">
                  <input type="hidden" name="formato" value={formato} />
                  {prontas.map((resultado) => (
                    <input
                      key={resultado.folhaId}
                      type="hidden"
                      name="folha_ponto_ids[]"
                      value={resultado.folhaId}
                    />
                  ))}
                  <button type="submit" className="action-btn action-btn--light">
                    Baixar {prontas.length} {prontas.length === 1 ? "folha" : "folhas"} em ZIP
                  </button>
                </form>
              ) : (
                <p className="fp-hint">
                  O ZIP aceita até {MAX_FOLHAS_POR_ZIP} folhas por vez. Divida o lote; os downloads individuais continuam disponíveis.
                </p>
              )}
              {falhas.length > 0 && (
                <p className="fp-hint">O ZIP inclui somente as folhas geradas com sucesso.</p>
              )}
            </div>
          )}
        </section>
      ) : (
        <>
          <ListaErros mensagens={erros} />

          <div className="form-grid">
            <label className="span2">
              Mês
              <select value={mes} onChange={alterar(setMes)} disabled={gerando}>
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
            <label>
              Ano
              <input type="number" min="2000" max="2100" value={ano} onChange={alterar(setAno)} disabled={gerando} />
            </label>
            <label className="span3">
              Formato
              <select value={formato} onChange={alterar(setFormato)} disabled={gerando}>
                <option value="docx">Word (.docx)</option>
                {pdfDisponivel && <option value="pdf">PDF</option>}
              </select>
            </label>
          </div>

          <section className="fp-batch-select" aria-label="Selecionar professores">
            <div className="fp-batch-select-head">
              <h3>Professores</h3>
              <span>{Object.keys(selecionados).length} selecionado(s)</span>
            </div>
            <label className="fp-batch-search">
              Buscar professor
              <input
                type="search"
                value={buscaProfessor}
                onChange={(e) => setBuscaProfessor(e.target.value)}
                placeholder="Nome ou matrícula"
                disabled={gerando}
              />
            </label>
            <ActionButton
              disabled={gerando || professoresVisiveis.length === 0}
              onClick={selecionarVisiveis}
            >
              {selecionadosVisiveis ? "Desmarcar visíveis" : "Selecionar visíveis"}
            </ActionButton>
            <ul className="fp-professor-list">
              {professoresVisiveis.map((professor) => {
                const gradeSelecionada = selecionados[professor.id];
                const marcado = gradeSelecionada !== undefined;

                return (
                  <li key={professor.id} className="fp-professor-item">
                    <label className="fp-professor-check">
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={(e) => alternarProfessor(professor, e.target.checked)}
                        disabled={gerando}
                      />
                      <span>
                        <strong>{professor.nome}</strong>
                        <small>Matrícula: {professor.matricula || "—"}</small>
                      </span>
                    </label>
                    {marcado && (
                      <label className="fp-professor-grade">
                        Grade usada
                        <select
                          value={gradeSelecionada}
                          onChange={(e) => alterarGradeProfessor(professor.id, e.target.value)}
                          disabled={gerando || professor.grades.length === 1}
                        >
                          {professor.grades.map((grade) => (
                            <option key={grade.id} value={grade.id}>
                              {grade.semestre || "Sem semestre"} · {dataBR(grade.validadeInicio)} a {dataBR(grade.validadeFim)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </li>
                );
              })}
              {professoresVisiveis.length === 0 && <li className="fp-hint">Nenhum professor encontrado.</li>}
            </ul>
          </section>

          {pdfDisponivel === null && !erroDisponibilidadePdf && (
            <p className="fp-hint" role="status">Verificando disponibilidade de PDF…</p>
          )}
          {pdfDisponivel === false && (
            <p className="fp-hint" role="status">PDF não está disponível neste ambiente. Gere a folha em Word.</p>
          )}
          {erroDisponibilidadePdf && (
            <p className="fp-hint" role="alert">
              Não foi possível verificar se PDF está disponível: {erroDisponibilidadePdf}
              {" "}A geração em Word continua disponível.
            </p>
          )}

          <p className="fp-hint">
            Todas as folhas usarão o mesmo mês, ano e formato. Para professores com mais de uma grade, selecione qual será usada.
            Uma nova geração para o mesmo professor e mês substitui a folha anterior.
          </p>
        </>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------
   Tela principal
------------------------------------------------------------------- */
export default function Folha() {
  const { grades, opcoes, status, erro, recarregar } = useGrades();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [selecionada, setSelecionada] = useState(null);
  const [editando, setEditando] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState("");
  const ultimoFiltroSolicitado = useRef({ busca, filtro });

  const filtrosDaTela = { q: busca.trim(), ...filtro };
  const visiveis = grades;
  const filtrosAtivos = Object.values(filtro).filter(Boolean).length;

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

  // Professor e grade são endpoints separados: `alteracoes` calcula o que mudou.
  const salvar = async (original, form) => {
    const mudancas = alteracoes(original, form);
    if (!mudancas.professor && !mudancas.grade) {
      setEditando(null);
      return;
    }

    try {
      await aplicarAlteracoes(original, mudancas);
    } finally {
      await recarregar({ silencioso: true, filtros: filtrosDaTela }); // também em falha parcial
    }

    setEditando(null);
    setAviso("Alterações salvas.");
  };

  return (
    <div className="folha">
      <Head title="Folhas de ponto" />
      <NavBar />

      <main id="conteudo" tabIndex={-1} className="fp" aria-busy={status === "carregando"}>
        <Toolbar>
          <SearchBar value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquise por professor, matrícula, disciplina ou curso..." />
          <FilterButton count={filtrosAtivos} onClick={() => setFiltroAberto(true)} />

          <ActionButton variant="light" icon={<IconNewDoc />} onClick={() => setGerando(true)}>
            Gerar Nova
          </ActionButton>
        </Toolbar>

        {filtroAberto && (
          <Filtro valores={filtro} opcoes={opcoes} onAplicar={setFiltro} onClose={() => setFiltroAberto(false)} />
        )}

        {aviso && (
          <p className="fp-toast" role="status">
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

        <section className="fp-list" aria-label="Grades">
          {status === "carregando" && <p className="fp-empty" role="status">Carregando grades…</p>}

          {status === "erro" && (
            <div className="fp-empty fp-falha" role="alert">
              <p>Não foi possível carregar as grades. {erro}</p>
              <ActionButton variant="light" onClick={() => recarregar()}>Tentar de novo</ActionButton>
            </div>
          )}

          {status === "ok" && (
            <>
              {visiveis.map((g) => (
                <GradeCard
                  key={g.id}
                  g={g}
                  selecionada={selecionada === g.id}
                  onSelect={setSelecionada}
                  onEdit={setEditando}
                />
              ))}
              {visiveis.length === 0 && (
                <p className="fp-empty">
                  {filtrosAtivos === 0 && !busca.trim()
                    ? "Nenhuma grade importada ainda. Importe uma na tela de Grade para gerar folhas."
                    : "Nenhuma grade encontrada. Ajuste a busca ou os filtros."}
                </p>
              )}
            </>
          )}
        </section>

        {editando && <ModalEditar grade={editando} onSave={salvar} onClose={() => setEditando(null)} />}
        {gerando && (
          <ModalGerar grades={grades} gradeInicial={selecionada} onClose={() => setGerando(false)} />
        )}
      </main>
    </div>
  );
}
