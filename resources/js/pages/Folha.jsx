import { useEffect, useMemo, useState } from "react";
import { Head } from "@inertiajs/react";
import NavBar from "../components/items/NavBar.jsx";
import Modal from "../components/items/Modal.jsx";
import Toolbar from "../components/items/Toolbar.jsx";
import SearchBar from "../components/items/SearchBar.jsx";
import FilterButton from "../components/items/FilterButton.jsx";
import ActionButton from "../components/items/ActionButton.jsx";
import { IconNewDoc, IconPen } from "../components/items/Icons.jsx";
import "../components/styles/folha.css";

//Sem integração ao backend(vai ter q mudar dps pra colocar os fetch)
const GRADES_INICIAIS = [
  {
    id: 1,
    unidade: "Fatec Zona Leste",
    cidade: "São Paulo",
    cod: "111",
    professor: "Katia Montreal Martinex",
    matricula: "1928374",
    regime: "CLT",
    categoria: "",
    comprovantes: "VIDE GRADE HORÁRIA",
    horaAulaSemanal: "",
    horaAtividade: "",
    haeProjeto: "",
    haeCoordenacao: "",
  },
  {
    id: 2,
    unidade: "Fatec Zona Leste",
    cidade: "São Paulo",
    cod: "111",
    professor: "Marcos Antunes Lopes",
    matricula: "2039485",
    regime: "Estatutário",
    categoria: "Titular",
    comprovantes: "VIDE GRADE HORÁRIA",
    horaAulaSemanal: "20",
    horaAtividade: "4",
    haeProjeto: "2",
    haeCoordenacao: "",
  },
];

const REGIMES = ["Todos", "CLT", "Estatutário"];

/* campos do formulário de edição, agrupados: [chave, rótulo, largura ("span2" | "span3")] */
const GRUPOS = [
  { titulo: "Unidade", campos: [
    ["unidade", "Unidade"], ["cidade", "Cidade"], ["cod", "COD"],
  ]},
  { titulo: "Professor(a)", campos: [
    ["professor", "Professor(a)", "span2"], ["matricula", "Matrícula"],
    ["regime", "Regime Jurídico"], ["categoria", "Categoria"],
    ["comprovantes", "Comprovante(s) Curricular(es)"],
  ]},
  { titulo: "Carga horária", campos: [
    ["horaAulaSemanal", "Hora-Aula Semanal"], ["horaAtividade", "Hora Atividade"],
    ["haeProjeto", "HAE (Projeto/Orientação)"], ["haeCoordenacao", "HAE (Coordenação)"],
  ]},
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

function GradeCard({ g, selecionada, onSelect, onEdit }) {
  return (
    <article
      className="fp-card"
      tabIndex={0}
      aria-current={selecionada ? "true" : undefined}
      aria-label={`Grade de ${g.professor}`}
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
        <Campo label={g.unidade} title />
        <Campo label="Cidade:" value={g.cidade} />
        <Campo label="COD:" value={g.cod} />
      </div>
      <div className="fp-row">
        <Campo label="Professor(a):" value={g.professor} />
        <Campo label="Matrícula:" value={g.matricula} />
        <Campo label="Regime Jurídico:" value={g.regime} />
        <Campo label="Categoria:" value={g.categoria} />
      </div>
      <div className="fp-row">
        <Campo label="Comprovante(s) Curricular(es)" value={g.comprovantes} />
        <Campo label="Hora-Aula Semanal:" value={g.horaAulaSemanal} />
        <Campo label="Hora Atividade:" value={g.horaAtividade} />
      </div>
      <div className="fp-row fp-row--wide">
        <Campo label="HAE (Projeto/Orientação):" value={g.haeProjeto} />
        <Campo label="HAE (Coordenação):" value={g.haeCoordenacao} />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------
   Modal: editar grade
------------------------------------------------------------------- */
function ModalEditar({ grade, onSave, onClose }) {
  const [form, setForm] = useState(grade);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal
      titulo="Editar grade"
      onClose={onClose}
      rodape={
        <>
          <ActionButton onClick={onClose}>Cancelar</ActionButton>
          <ActionButton variant="light" onClick={() => onSave(form)}>Salvar alterações</ActionButton>
        </>
      }
    >
      {GRUPOS.map((grupo) => (
        <section className="form-group" key={grupo.titulo}>
          <h3>{grupo.titulo}</h3>
          <div className="form-grid">
            {grupo.campos.map(([k, label, largura]) => (
              <label key={k} className={largura}>
                {label}
                <input value={form[k]} onChange={set(k)} />
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
------------------------------------------------------------------- */
function ModalGerar({ grades, gradeInicial, onClose }) {
  const hoje = new Date();
  const [gradeId, setGradeId] = useState(gradeInicial ?? grades[0]?.id ?? "");
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [folha, setFolha] = useState(null);

  const gerar = () => {
    const g = grades.find((x) => x.id === Number(gradeId));
    if (!g) return;
    const total = new Date(ano, Number(mes) + 1, 0).getDate();
    const dias = Array.from({ length: total }, (_, i) => {
      const d = new Date(ano, Number(mes), i + 1);
      return { dia: i + 1, sem: DIAS_SEMANA[d.getDay()], fim: d.getDay() === 0 || d.getDay() === 6 };
    });
    setFolha({ g, dias });
  };

  return (
    <Modal
      titulo="Gerar nova folha de ponto"
      descricao="Escolha a grade e o mês de referência."
      onClose={onClose}
      rodape={
        <>
          <ActionButton onClick={onClose}>Fechar</ActionButton>
          {folha && <ActionButton onClick={() => window.print()}>Imprimir</ActionButton>}
          <ActionButton variant="light" onClick={gerar}>
            {folha ? "Gerar novamente" : "Gerar folha"}
          </ActionButton>
        </>
      }
    >
      <div className="form-grid">
        <label className="span3">
          Grade
          <select value={gradeId} onChange={(e) => { setGradeId(e.target.value); setFolha(null); }}>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>{g.professor} — {g.matricula}</option>
            ))}
          </select>
        </label>
        <label className="span2">
          Mês
          <select value={mes} onChange={(e) => { setMes(e.target.value); setFolha(null); }}>
            {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        </label>
        <label>
          Ano
          <input type="number" value={ano} onChange={(e) => { setAno(Number(e.target.value)); setFolha(null); }} />
        </label>
      </div>

      {folha && (
        <div className="fp-sheet">
          <h3>Folha de ponto — {MESES[mes]} de {ano}</h3>
          <div className="meta">
            <span><b>Unidade:</b> {folha.g.unidade}</span>
            <span><b>Cidade:</b> {folha.g.cidade}</span>
            <span><b>COD:</b> {folha.g.cod}</span>
            <span><b>Professor(a):</b> {folha.g.professor}</span>
            <span><b>Matrícula:</b> {folha.g.matricula}</span>
            <span><b>Regime Jurídico:</b> {folha.g.regime}</span>
            <span><b>Categoria:</b> {folha.g.categoria}</span>
            <span><b>Hora-Aula Semanal:</b> {folha.g.horaAulaSemanal}</span>
            <span><b>Hora Atividade:</b> {folha.g.horaAtividade}</span>
            <span><b>HAE (Projeto/Orientação):</b> {folha.g.haeProjeto}</span>
            <span><b>HAE (Coordenação):</b> {folha.g.haeCoordenacao}</span>
          </div>
          <table>
            <thead>
              <tr><th>Dia</th><th>Entrada</th><th>Saída</th><th>Entrada</th><th>Saída</th><th>Assinatura</th></tr>
            </thead>
            <tbody>
              {folha.dias.map((d) => (
                <tr key={d.dia}>
                  <td className={d.fim ? "dim" : ""}>{String(d.dia).padStart(2, "0")} {d.sem}</td>
                  {[0, 1, 2, 3, 4].map((c) => <td key={c} className={d.fim ? "dim" : ""} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------
   Tela principal
------------------------------------------------------------------- */
export default function Folha() {
  const [grades, setGrades] = useState(GRADES_INICIAIS);
  const [busca, setBusca] = useState("");
  const [regime, setRegime] = useState("Todos");
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [selecionada, setSelecionada] = useState(null);
  const [editando, setEditando] = useState(null);
  const [gerando, setGerando] = useState(false);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return grades.filter((g) => {
      const okRegime = regime === "Todos" || g.regime === regime;
      const okBusca = !q || Object.values(g).join(" ").toLowerCase().includes(q);
      return okRegime && okBusca;
    });
  }, [grades, busca, regime]);

  // Esc fecha o menu de regime
  useEffect(() => {
    if (!filtroAberto) return;
    const esc = (e) => e.key === "Escape" && setFiltroAberto(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [filtroAberto]);

  const salvar = (nova) => {
    setGrades((gs) => gs.map((g) => (g.id === nova.id ? nova : g)));
    setEditando(null);
  };

  return (
    <div className="folha">
      <Head title="Folhas de ponto" />
      <NavBar />

      <main id="conteudo" tabIndex={-1} className="fp">
        <Toolbar>
          <SearchBar value={busca} onChange={(e) => setBusca(e.target.value)} />

          <div className="fp-filter-wrap">
            <FilterButton
              count={regime === "Todos" ? 0 : 1}
              aria-expanded={filtroAberto}
              onClick={() => setFiltroAberto((v) => !v)}
            />
            {filtroAberto && (
              <div className="fp-menu" role="group" aria-label="Filtrar por regime jurídico">
                {REGIMES.map((r) => (
                  <button key={r} aria-pressed={regime === r}
                          onClick={() => { setRegime(r); setFiltroAberto(false); }}>
                    {r === "Todos" ? "Todos os regimes" : r}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ActionButton variant="light" icon={<IconNewDoc />} onClick={() => setGerando(true)}>
            Gerar Nova
          </ActionButton>
        </Toolbar>

        {/* anuncia para leitores de tela quantas grades restaram após buscar/filtrar */}
        <p className="sr-only" role="status">
          {visiveis.length} {visiveis.length === 1 ? "grade encontrada" : "grades encontradas"}
        </p>

        <section className="fp-list" aria-label="Grades">
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
            <p className="fp-empty">Nenhuma grade encontrada. Ajuste a busca ou os filtros.</p>
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
