/*
 * Cliente HTTP do back-end (routes/api.php, prefixo /api).
 *
 * Usa fetch puro: as rotas da API são stateless (sem CSRF/sessão), então não
 * precisa de token. O Inertia continua responsável só pela navegação/páginas.
 */

export class ApiError extends Error {
    constructor(message, { status = 0, errors = {} } = {}) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.errors = errors; // { campo: ["mensagem", ...] } vindo do 422 do Laravel
    }

    /** Todas as mensagens de validação em uma lista simples. */
    get detalhes() {
        return Object.values(this.errors).flat();
    }
}

async function request(caminho, { method = "GET", json, formData } = {}) {
    const headers = { Accept: "application/json" };
    let body;

    if (formData) {
        body = formData; // o browser define o Content-Type (multipart) sozinho
    } else if (json !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(json);
    }

    let resposta;
    try {
        resposta = await fetch(`/api${caminho}`, { method, headers, body });
    } catch {
        throw new ApiError("Não foi possível falar com o servidor. Verifique a conexão e tente de novo.");
    }

    if (resposta.status === 204) return null;

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        throw new ApiError(dados?.message || `Erro ${resposta.status} ao falar com o servidor.`, {
            status: resposta.status,
            errors: dados?.errors,
        });
    }

    return dados;
}

/* ---------------- grades horárias ---------------- */
export const gradesApi = {
    /** GET /api/grades-horarias */
    listar: () => request("/grades-horarias"),

    /** GET /api/grades-horarias/{id} */
    obter: (id) => request(`/grades-horarias/${id}`),

    /** PATCH /api/grades-horarias/{id}  { semestre, validade_inicio, validade_fim } */
    atualizar: (id, dados) => request(`/grades-horarias/${id}`, { method: "PATCH", json: dados }),

    /** DELETE /api/grades-horarias/{id} */
    excluir: (id) => request(`/grades-horarias/${id}`, { method: "DELETE" }),

    /** POST /api/grades  (multipart, campo "arquivo": PDF ou DOCX). Devolve { grade_horaria }. */
    importar: (arquivo) => {
        const formData = new FormData();
        formData.append("arquivo", arquivo);
        return request("/grades", { method: "POST", formData });
    },
};

/* ---------------- professores ---------------- */
export const professoresApi = {
    /** PATCH /api/professores/{id}  { nome, matricula, cpf, regime_juridico, categoria } */
    atualizar: (id, dados) => request(`/professores/${id}`, { method: "PATCH", json: dados }),
};

/* ---------------- folhas de ponto ---------------- */
export const folhasApi = {
    /**
     * POST /api/professores/{id}/folhas-ponto
     * dados: { mes (1-12), ano, grade_horaria_id, formato: "docx" | "pdf" }
     * Devolve { folha_ponto, download_url } — download_url é relativa e baixa o arquivo.
     */
    gerar: (professorId, dados) => request(`/professores/${professorId}/folhas-ponto`, { method: "POST", json: dados }),
};

/**
 * Aplica o resultado de `alteracoes()` (utils/grade.js): professor e grade são endpoints
 * separados, então cada um só é chamado se houve mudança nele.
 */
export async function aplicarAlteracoes(original, { professor, grade }) {
    if (professor) await professoresApi.atualizar(original.professorId, professor);
    if (grade) await gradesApi.atualizar(original.id, grade);
}
