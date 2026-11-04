import { useEffect, useMemo, useState } from "react";
import { Head } from "@inertiajs/react";
import NavBar from "../components/items/NavBar.jsx";
import Modal from "../components/items/Modal.jsx";
import Toolbar from "../components/items/Toolbar.jsx";
import SearchBar from "../components/items/SearchBar.jsx";
import FilterButton from "../components/items/FilterButton.jsx";
import ActionButton from "../components/items/ActionButton.jsx";
import { IconNewDoc, IconPen } from "../components/items/Icons.jsx";
import useGrades from "../hooks/useGrades.js";
import { aplicarAlteracoes, folhasApi } from "../services/api.js";
import { alteracoes, dataBR, FOLHA_FIXOS, MESES } from "../utils/grade.js";
import "../components/styles/Folha.css";

const TODOS = "Todos";

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

/* ------------------------------------------------------------------
   Modal: gerar nova folha de ponto a partir de uma grade
   POST /api/professores/{id}/folhas-ponto → download_url
------------------------------------------------------------------- */
function ModalGerar({ grades, gradeInicial, onClose }) {
  const hoje = new Date();
  const [gradeId, setGradeId] = useState(gradeInicial ?? grades[0]?.id ?? "");
  const [mes, setMes] = useState(hoje.getMonth() + 1); // 1-12, como a API espera
  const [ano, setAno] = useState(hoje.getFullYear());
  const [formato, setFormato] = useState("docx");
  const [gerando, setGerando] = useState(false);
  const [erros, setErros] = useState([]);
  const [pronta, setPronta] = useState(null); // { url, formato, nome, mes, ano }

  // qualquer mudança nos parâmetros invalida a folha já gerada
  const alterar = (setter) => (e) => { setter(e.target.value); setPronta(null); setErros([]); };

  const gerar = async () => {
    const g = grades.find((x) => x.id === Number(gradeId));
    if (!g) return;
    if (!Number.isInteger(Number(ano)) || ano < 2000 || ano > 2100) {
      setErros(["Informe um ano entre 2000 e 2100."]);
      return;
    }

    setGerando(true);
    setErros([]);
    setPronta(null);
    try {
      const { download_url: url } = await folhasApi.gerar(g.professorId, {
        mes: Number(mes),
        ano: Number(ano),
        grade_horaria_id: g.id,
        formato,
      });
      setPronta({ url, formato, nome: g.nome, mes: Number(mes), ano: Number(ano) });
    } catch (e) {
      const msgs = mensagensDoErro(e);
      if (formato === "pdf") msgs.push("O PDF depende do LibreOffice no servidor. Se não estiver instalado, gere em Word (.docx).");
      setErros(msgs);
    } finally {
      setGerando(false);
    }
  };

  return (
    <Modal
      titulo="Gerar nova folha de ponto"
      descricao="Escolha a grade e o mês de referência."
      onClose={gerando ? () => {} : onClose}
      rodape={
        <>
          <ActionButton disabled={gerando} onClick={onClose}>Fechar</ActionButton>
          <ActionButton variant="light" disabled={gerando || grades.length === 0} onClick={gerar}>
            {gerando ? "Gerando…" : pronta ? "Gerar novamente" : "Gerar folha"}
          </ActionButton>
        </>
      }
    >
      {grades.length === 0 ? (
        <p className="fp-hint">Nenhuma grade importada. Importe uma grade na tela de Grade antes de gerar a folha.</p>
      ) : (
        <>
          <ListaErros mensagens={erros} />

          <div className="form-grid">
            <label className="span3">
              Grade
              <select value={gradeId} onChange={alterar(setGradeId)} disabled={gerando}>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome} — {g.matricula}{g.semestre ? ` · ${g.semestre}` : ""}
                  </option>
                ))}
              </select>
            </label>
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
                <option value="pdf">PDF (requer LibreOffice no servidor)</option>
              </select>
            </label>
          </div>

          <p className="fp-hint">
            A folha é preenchida com a grade de aulas e os dados do cabeçalho (edite em “Editar”).
            Gerar de novo para o mesmo professor e mês substitui a folha anterior.
          </p>

          {pronta && (
            <div className="fp-ok" role="status">
              <p>
                Folha de <b>{MESES[pronta.mes - 1]}/{pronta.ano}</b> de {pronta.nome} gerada.
              </p>
              <a className="action-btn action-btn--light fp-download" href={pronta.url} download>
                Baixar {pronta.formato === "pdf" ? "PDF" : "Word (.docx)"}
              </a>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------
   Tela principal
------------------------------------------------------------------- */
export default function Folha() {
  const { grades, status, erro, recarregar } = useGrades();
  const [busca, setBusca] = useState("");
  const [regime, setRegime] = useState(TODOS);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [selecionada, setSelecionada] = useState(null);
  const [editando, setEditando] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState("");

  const regimes = useMemo(
    () => [TODOS, ...[...new Set(grades.map((g) => g.contrato).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"))],
    [grades],
  );

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return grades.filter((g) => {
      const okRegime = regime === TODOS || g.contrato === regime;
      const texto = [
        g.nome, g.matricula, g.contrato, g.categoria, g.semestre,
        g.horaAulaSemanal, g.horaAtividade, g.haeProjeto, g.haeCoordenacao,
      ].join(" ").toLowerCase();
      return okRegime && (!q || texto.includes(q));
    });
  }, [grades, busca, regime]);

  // Esc fecha o menu de regime
  useEffect(() => {
    if (!filtroAberto) return;
    const esc = (e) => e.key === "Escape" && setFiltroAberto(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [filtroAberto]);

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
      await recarregar({ silencioso: true }); // também em falha parcial
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
          <SearchBar value={busca} onChange={(e) => setBusca(e.target.value)} />

          <div className="fp-filter-wrap">
            <FilterButton
              count={regime === TODOS ? 0 : 1}
              aria-expanded={filtroAberto}
              onClick={() => setFiltroAberto((v) => !v)}
            />
            {filtroAberto && (
              <div className="fp-menu" role="group" aria-label="Filtrar por regime jurídico">
                {regimes.map((r) => (
                  <button key={r} aria-pressed={regime === r}
                          onClick={() => { setRegime(r); setFiltroAberto(false); }}>
                    {r === TODOS ? "Todos os regimes" : r}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ActionButton variant="light" icon={<IconNewDoc />} onClick={() => setGerando(true)}>
            Gerar Nova
          </ActionButton>
        </Toolbar>

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
                  {grades.length === 0
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
