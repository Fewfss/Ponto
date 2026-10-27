import { useRef, useState } from "react";
import useDialogA11y from "../../hooks/useDialogA11y.js";
import Logo from "./Logo.jsx";
import ActionButton from "./ActionButton.jsx";
import { IconFilter } from "./Icons.jsx";
import "../styles/Filtro.css";

export const FILTRO_VAZIO = { inicio: "", fim: "", semestre: "", curso: "", periodo: "", status: "" };

function Filtro({ valores = FILTRO_VAZIO, opcoes = {}, onAplicar, onClose }) {
    const painelRef = useRef(null);
    const [rascunho, setRascunho] = useState(valores);
    useDialogA11y(painelRef, onClose);

    const set = (k) => (e) => setRascunho((r) => ({ ...r, [k]: e.target.value }));
    const { semestres = [], cursos = [], periodos = [], statuses = [] } = opcoes;

    const aplicar = (e) => {
        e.preventDefault();
        onAplicar?.(rascunho);
        onClose();
    };

    return (
        <div className="filtro-overlay" onMouseDown={onClose}>
            <aside className="filtro" ref={painelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Filtros"
                   onMouseDown={(e) => e.stopPropagation()}>
                <button className="filtro-close" onClick={onClose} aria-label="Fechar filtros">
                    ×
                </button>

                <h1 className="filtro-title">
                    <IconFilter />
                    Filtros
                </h1>

                <form id="filtro-form" className="filtro-fields" onSubmit={aplicar}>
                    <label className="filtro-field">
                        <span>Vigente a partir de</span>
                        <input type="date" value={rascunho.inicio} onChange={set("inicio")} />
                    </label>

                    <label className="filtro-field">
                        <span>Vigente até</span>
                        <input type="date" value={rascunho.fim} onChange={set("fim")} />
                    </label>

                    <label className="filtro-field">
                        <span>Semestre</span>
                        <select value={rascunho.semestre} onChange={set("semestre")}>
                            <option value="">Todos os semestres</option>
                            {semestres.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>

                    <label className="filtro-field">
                        <span>Curso</span>
                        <select value={rascunho.curso} onChange={set("curso")}>
                            <option value="">Todos os cursos</option>
                            {cursos.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </label>

                    <label className="filtro-field">
                        <span>Período</span>
                        <select value={rascunho.periodo} onChange={set("periodo")}>
                            <option value="">Todos os períodos</option>
                            {periodos.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </label>

                    <label className="filtro-field">
                        <span>Status</span>
                        <select value={rascunho.status} onChange={set("status")}>
                            <option value="">Todos os status</option>
                            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>
                </form>

                <div className="filtro-actions">
                    <ActionButton onClick={() => setRascunho(FILTRO_VAZIO)}>Limpar</ActionButton>
                    <ActionButton variant="light" type="submit" form="filtro-form">Aplicar</ActionButton>
                </div>

                <div className="filtro-logo">
                    <div className="filtro-logo-scale">
                        <Logo decorativo />
                    </div>
                </div>
            </aside>
        </div>
    );
}

export default Filtro;
