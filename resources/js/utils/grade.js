/*
 * Constantes, helpers e adaptador da tela de Grade.
 *
 * O back devolve snake_case (dia_semana, quantidade_aulas, periodo "manha"...),
 * enquanto os componentes de UI (GradeCard, GradeDocumento, Filtro) trabalham
 * com o formato abaixo. `adaptarGrade` faz a ponte — assim a UI não precisa
 * saber nada sobre a API.
 */

export const DIAS = [
    { id: "segunda", label: "Segunda" },
    { id: "terca", label: "Terça" },
    { id: "quarta", label: "Quarta" },
    { id: "quinta", label: "Quinta" },
    { id: "sexta", label: "Sexta" },
    { id: "sabado", label: "Sábado" },
];

export const PERIODOS = [
    { id: "Manhã", label: "Manhã" },
    { id: "Tarde", label: "Tarde" },
    { id: "Noite", label: "Noite" },
];

// Linhas fixas do quadro "HAE - RJI" do PDF
export const HAE_RJI = [
    "Coordenador de Fatec e Vice-Diretor de Faculdade",
    "Assessoria ao CEETEPS",
    "Assessoria À Vice-Diretor de Faculdade",
    "Coordenadoria de curso/Chefia de Departamento",
    "HAEs - Projetos no CEETEPS Cesu, Inova, Biblioteca, etc)",
    "HAEs - Projetos nas Fatecs",
    "HAEs - Projetos de Graduação",
    "HAEs - Estágio Supervisionado",
    "RJI",
    "HAE EAD (Mediador Online/Professor Autor/Orientador)",
];

// O PDF traz a unidade no cabeçalho, mas o back ainda não a extrai/guarda.
export const UNIDADE_PADRAO = "111 - Faculdade de Tecnologia da Zona Leste";

// Texto fixo do cabeçalho do modelo .docx da folha de ponto (não é gerado pelo back).
export const FOLHA_FIXOS = {
    unidade: "FATEC ZONA LESTE",
    cidade: "SÃO PAULO",
    cod: "265",
    comprovantes: "VIDE GRADE HORÁRIA",
};

export const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/* ---------- helpers de exibição ---------- */
export const dataBR = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");

export const totais = (grade) => {
    const semanal = grade.componentes.reduce((s, c) => s + Number(c.qtde || 0), 0);
    const mensal = semanal * 4.5;
    const atividade = mensal * 0.5;
    return { semanal, mensal, atividade, total: mensal + atividade };
};

export const fmtNum = (n) => String(n).replace(".", ",");

/* ---------- API → UI ---------- */
const PERIODO_LABEL = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };

const hhmm = (t) => (t ? String(t).slice(0, 5) : ""); // "07:30:00" → "07:30"
const soData = (d) => (d ? String(d).slice(0, 10) : null); // "2026-03-07..." → "2026-03-07"
const semSufixo = (nome) => (nome ?? "").replace(/\s*\(.*?\)\s*$/u, ""); // "ESPANHOL I (Determinada)" → "ESPANHOL I"

export function adaptarGrade(g) {
    const professor = g.professor ?? {};

    const componentes = (g.componentes_curriculares ?? []).map((c) => ({
        id: c.id,
        disciplina: c.disciplina,
        curso: c.curso ?? "",
        periodo: PERIODO_LABEL[c.periodo] ?? c.periodo,
        status: c.status ?? "",
        qtde: c.quantidade_aulas ?? 0,
    }));

    const aulas = (g.aulas ?? []).map((a) => ({
        id: a.id,
        componenteId: a.componente_curricular_id,
        dia: a.dia_semana,
        periodo: PERIODO_LABEL[a.periodo] ?? a.periodo,
        inicio: hhmm(a.hora_inicio),
        fim: hhmm(a.hora_fim),
        disciplina: semSufixo(a.componente_curricular?.disciplina),
        codigoOp: a.codigo_op ?? "",
    }));

    // Nomes de coordenador/chefes não são guardados pelo back: mostramos só a
    // função (uma linha de aprovação por curso), sem inventar nomes.
    const cursos = [...new Set(componentes.map((c) => c.curso).filter(Boolean))];

    return {
        id: g.id,
        professorId: g.professor_id ?? professor.id,
        unidade: UNIDADE_PADRAO,
        semestre: g.semestre ?? "",
        validadeInicio: soData(g.validade_inicio),
        validadeFim: soData(g.validade_fim),
        matricula: professor.matricula ?? "",
        nome: professor.nome ?? "",
        cpf: professor.cpf ?? "",
        contrato: professor.regime_juridico ?? "",
        categoria: professor.categoria ?? "",
        horaAulaSemanal: g.hora_aula_semanal == null ? "" : String(g.hora_aula_semanal),
        horaAtividade: g.hora_atividade ?? "",
        haeProjeto: g.hae_projeto ?? "",
        haeCoordenacao: g.hae_coordenacao ?? "",
        componentes,
        aulas,
        haeRji: {},
        assinaturas: {
            coordenadorFatec: "",
            chefes: cursos.map((curso) => ({ nome: "", funcao: `Chefe de Depto/Coordenador ${curso}` })),
        },
    };
}

/* ---------- UI → API (edição) ---------- */
const texto = (v) => String(v ?? "").trim();
const nulo = (v) => (texto(v) === "" ? null : texto(v));
const mudou = (original, form, campos) => campos.some((k) => texto(original[k]) !== texto(form[k]));

/**
 * Compara o formulário com a grade original e devolve só o que precisa ser enviado:
 *   { professor: payload | null, grade: payload | null }
 * (professor → PATCH /professores/{id}; grade → PATCH /grades-horarias/{id}).
 * Lança Error com mensagem amigável se algum valor for inválido.
 */
export function alteracoes(original, form) {
    const professor = mudou(original, form, ["nome", "matricula", "cpf", "contrato", "categoria"])
        ? {
            nome: texto(form.nome),
            matricula: texto(form.matricula),
            cpf: nulo(form.cpf),
            regime_juridico: nulo(form.contrato),
            categoria: nulo(form.categoria),
        }
        : null;

    const grade = {};
    // validade_fim usa "after_or_equal:validade_inicio" no back: as três vão sempre juntas.
    if (mudou(original, form, ["semestre", "validadeInicio", "validadeFim"])) {
        Object.assign(grade, {
            semestre: nulo(form.semestre),
            validade_inicio: nulo(form.validadeInicio),
            validade_fim: nulo(form.validadeFim),
        });
    }
    if (mudou(original, form, ["horaAulaSemanal"])) {
        const n = nulo(form.horaAulaSemanal);
        if (n !== null && !/^\d+$/.test(n)) throw new Error("Hora-aula semanal deve ser um número inteiro.");
        grade.hora_aula_semanal = n === null ? null : Number(n);
    }
    if (mudou(original, form, ["horaAtividade"])) grade.hora_atividade = nulo(form.horaAtividade);
    if (mudou(original, form, ["haeProjeto"])) grade.hae_projeto = nulo(form.haeProjeto);
    if (mudou(original, form, ["haeCoordenacao"])) grade.hae_coordenacao = nulo(form.haeCoordenacao);

    return { professor, grade: Object.keys(grade).length ? grade : null };
}
