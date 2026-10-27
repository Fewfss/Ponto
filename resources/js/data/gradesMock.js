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

const UNIDADE = "111 - Faculdade de Tecnologia da Zona Leste";
const COORD_FATEC = "DANIELE DOS SANTOS RAMOS XAVIER";

export const GRADES_INICIAIS = [
    {
        id: 1,
        unidade: UNIDADE,
        semestre: "1º/2026",
        validadeInicio: "2026-03-07",
        validadeFim: "2026-03-15",
        matricula: "89261",
        nome: "ALEXANDRE FALCAO SANSEVERINO",
        cpf: "289888478-22",
        contrato: "Determinado",
        componentes: [
            { disciplina: "ESPANHOL I (Determinada)", curso: "Comércio Exterior", periodo: "Tarde", status: "Ministrando", qtde: 2 },
            { disciplina: "ESPANHOL II (Determinada)", curso: "Gestão de Recursos Humanos", periodo: "Manhã", status: "Ministrando", qtde: 2 },
            { disciplina: "ESPANHOL IV (Determinada)", curso: "Comércio Exterior", periodo: "Noite", status: "Ministrando", qtde: 2 },
        ],
        aulas: [
            { dia: "sabado", periodo: "Manhã", inicio: "07:30", fim: "08:20", disciplina: "ESPANHOL II" },
            { dia: "sabado", periodo: "Manhã", inicio: "08:20", fim: "09:10", disciplina: "ESPANHOL II" },
            { dia: "sabado", periodo: "Manhã", inicio: "09:50", fim: "10:40", disciplina: "ESPANHOL I" },
            { dia: "sabado", periodo: "Manhã", inicio: "10:40", fim: "11:30", disciplina: "ESPANHOL I" },
            { dia: "quarta", periodo: "Noite", inicio: "19:20", fim: "20:10", disciplina: "ESPANHOL IV" },
            { dia: "quarta", periodo: "Noite", inicio: "20:10", fim: "21:00", disciplina: "ESPANHOL IV" },
        ],
        haeRji: {},
        assinaturas: {
            coordenadorFatec: COORD_FATEC,
            chefes: [
                { nome: "RENATA LIMA DE PAIVA", funcao: "Chefe de Depto/Coordenador Comércio Exterior" },
                { nome: "EDSON DEMETRIO LEAL", funcao: "Chefe de Depto/Coordenador Gestão de Recursos Humanos" },
            ],
        },
    },
    {
        id: 2,
        unidade: UNIDADE,
        semestre: "1º/2026",
        validadeInicio: "2026-02-23",
        validadeFim: "2026-07-04",
        matricula: "70412",
        nome: "MARINA COSTA ALBUQUERQUE",
        cpf: "111222333-44",
        contrato: "Indeterminado",
        componentes: [
            { disciplina: "INGLÊS III", curso: "Análise e Desenvolvimento de Sistemas", periodo: "Noite", status: "Ministrando", qtde: 4 },
            { disciplina: "INGLÊS V", curso: "Análise e Desenvolvimento de Sistemas", periodo: "Noite", status: "Ministrando", qtde: 2 },
            { disciplina: "COMUNICAÇÃO E EXPRESSÃO", curso: "Gestão Empresarial", periodo: "Manhã", status: "Ministrando", qtde: 4 },
        ],
        aulas: [
            { dia: "segunda", periodo: "Noite", inicio: "19:20", fim: "20:10", disciplina: "INGLÊS III" },
            { dia: "segunda", periodo: "Noite", inicio: "20:10", fim: "21:00", disciplina: "INGLÊS III" },
            { dia: "quinta", periodo: "Noite", inicio: "19:20", fim: "20:10", disciplina: "INGLÊS III" },
            { dia: "quinta", periodo: "Noite", inicio: "20:10", fim: "21:00", disciplina: "INGLÊS III" },
            { dia: "sexta", periodo: "Noite", inicio: "19:20", fim: "20:10", disciplina: "INGLÊS V" },
            { dia: "sexta", periodo: "Noite", inicio: "20:10", fim: "21:00", disciplina: "INGLÊS V" },
            { dia: "terca", periodo: "Manhã", inicio: "07:30", fim: "08:20", disciplina: "COMUNICAÇÃO E EXPRESSÃO" },
            { dia: "terca", periodo: "Manhã", inicio: "08:20", fim: "09:10", disciplina: "COMUNICAÇÃO E EXPRESSÃO" },
            { dia: "terca", periodo: "Manhã", inicio: "09:50", fim: "10:40", disciplina: "COMUNICAÇÃO E EXPRESSÃO" },
            { dia: "terca", periodo: "Manhã", inicio: "10:40", fim: "11:30", disciplina: "COMUNICAÇÃO E EXPRESSÃO" },
        ],
        haeRji: { 4: 4, 6: 2 },
        assinaturas: {
            coordenadorFatec: COORD_FATEC,
            chefes: [
                { nome: "CARLOS EDUARDO MOURA", funcao: "Chefe de Depto/Coordenador Análise e Desenvolvimento de Sistemas" },
                { nome: "PATRICIA NOGUEIRA SILVA", funcao: "Chefe de Depto/Coordenador Gestão Empresarial" },
            ],
        },
    },
    {
        id: 3,
        unidade: UNIDADE,
        semestre: "2º/2025",
        validadeInicio: "2025-08-04",
        validadeFim: "2025-12-19",
        matricula: "65530",
        nome: "PAULO HENRIQUE DUARTE LIMA",
        cpf: "555666777-88",
        contrato: "Determinado",
        componentes: [
            { disciplina: "LOGÍSTICA EMPRESARIAL", curso: "Logística", periodo: "Tarde", status: "Ministrando", qtde: 4 },
            { disciplina: "GESTÃO DE ESTOQUES", curso: "Logística", periodo: "Tarde", status: "Substituição", qtde: 2 },
        ],
        aulas: [
            { dia: "segunda", periodo: "Tarde", inicio: "13:30", fim: "14:20", disciplina: "LOGÍSTICA EMPRESARIAL" },
            { dia: "segunda", periodo: "Tarde", inicio: "14:20", fim: "15:10", disciplina: "LOGÍSTICA EMPRESARIAL" },
            { dia: "quarta", periodo: "Tarde", inicio: "13:30", fim: "14:20", disciplina: "LOGÍSTICA EMPRESARIAL" },
            { dia: "quarta", periodo: "Tarde", inicio: "14:20", fim: "15:10", disciplina: "LOGÍSTICA EMPRESARIAL" },
            { dia: "sexta", periodo: "Tarde", inicio: "15:20", fim: "16:10", disciplina: "GESTÃO DE ESTOQUES" },
            { dia: "sexta", periodo: "Tarde", inicio: "16:10", fim: "17:00", disciplina: "GESTÃO DE ESTOQUES" },
        ],
        haeRji: { 7: 2 },
        assinaturas: {
            coordenadorFatec: COORD_FATEC,
            chefes: [
                { nome: "FERNANDA ALVES RIBEIRO", funcao: "Chefe de Depto/Coordenador Logística" },
            ],
        },
    },
];

/* ---------- helpers ---------- */
export const dataBR = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");

export const totais = (grade) => {
    const semanal = grade.componentes.reduce((s, c) => s + Number(c.qtde || 0), 0);
    const mensal = semanal * 4.5;
    const atividade = mensal * 0.5;
    return { semanal, mensal, atividade, total: mensal + atividade };
};

export const fmtNum = (n) => String(n).replace(".", ",");
