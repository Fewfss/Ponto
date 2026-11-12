import { useCallback, useEffect, useRef, useState } from "react";
import { gradesApi } from "../services/api.js";
import { adaptarGrade } from "../utils/grade.js";

/**
 * Carrega grades e opções do back (GET /api/grades-horarias) no formato da UI.
 *
 * status: "carregando" | "ok" | "erro"
 * recarregar({ silencioso }) — silencioso mantém a lista na tela (sem "Carregando…")
 * e devolve true/false em vez de trocar a tela por um erro.
 */
export default function useGrades() {
    const [grades, setGrades] = useState([]);
    const [opcoes, setOpcoes] = useState({});
    const [status, setStatus] = useState("carregando");
    const [erro, setErro] = useState("");
    const ultimaRequisicao = useRef(0);

    const recarregar = useCallback(async ({ silencioso = false, filtros = {} } = {}) => {
        const id = ++ultimaRequisicao.current;
        if (!silencioso) setStatus("carregando");

        try {
            const resultado = await gradesApi.listar(filtros);
            if (id !== ultimaRequisicao.current) return true; // chegou uma resposta mais nova
            setGrades(resultado.data.map(adaptarGrade));
            setOpcoes(resultado.opcoes);
            setStatus("ok");
            setErro("");
            return true;
        } catch (e) {
            if (id !== ultimaRequisicao.current) return false;
            if (!silencioso) {
                setStatus("erro");
                setErro(e.message);
            }
            return false;
        }
    }, []);

    useEffect(() => { recarregar(); }, [recarregar]);

    return { grades, setGrades, opcoes, status, erro, recarregar };
}
