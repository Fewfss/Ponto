import { useCallback, useEffect, useRef, useState } from "react";
import { gradesApi } from "../services/api.js";
import { adaptarGrade } from "../utils/grade.js";

/**
 * Carrega a lista de grades do back (GET /api/grades-horarias) já no formato da UI.
 *
 * status: "carregando" | "ok" | "erro"
 * recarregar({ silencioso }) — silencioso mantém a lista na tela (sem "Carregando…")
 * e devolve true/false em vez de trocar a tela por um erro.
 */
export default function useGrades() {
    const [grades, setGrades] = useState([]);
    const [status, setStatus] = useState("carregando");
    const [erro, setErro] = useState("");
    const ultimaRequisicao = useRef(0);

    const recarregar = useCallback(async ({ silencioso = false } = {}) => {
        const id = ++ultimaRequisicao.current;
        if (!silencioso) setStatus("carregando");

        try {
            const lista = await gradesApi.listar();
            if (id !== ultimaRequisicao.current) return true; // chegou uma resposta mais nova
            setGrades(lista.map(adaptarGrade));
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

    return { grades, setGrades, status, erro, recarregar };
}
