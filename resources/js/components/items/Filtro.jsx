import { useRef } from "react";
import useDialogA11y from "../../hooks/useDialogA11y.js";
import Logo from "./Logo.jsx";
import { IconFilter } from "./Icons.jsx";
import "../styles/Filtro.css";

const SEMESTRES = [1, 2, 3, 4, 5, 6];

function Filtro({ onClose }) {
    const painelRef = useRef(null);
    useDialogA11y(painelRef, onClose);

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

                <form className="filtro-fields" onSubmit={(e) => e.preventDefault()}>
                    <label className="filtro-field">
                        <span>Validade início</span>
                        <input type="date" name="validadeInicio" />
                    </label>

                    <label className="filtro-field">
                        <span>Validade fim</span>
                        <input type="date" name="validadeFim" />
                    </label>

                    <label className="filtro-field">
                        <span>Semestre</span>
                        <select name="semestre" defaultValue="">
                            <option value="">Todos os semestres</option>
                            {SEMESTRES.map((s) => (
                                <option key={s} value={s}>{s}º semestre</option>
                            ))}
                        </select>
                    </label>

                    <label className="filtro-field">
                        <span>Curso</span>
                        <select name="curso" defaultValue="">
                            <option value="">Todos os cursos</option>
                        </select>
                    </label>

                    <label className="filtro-field">
                        <span>Período</span>
                        <select name="periodo" defaultValue="">
                            <option value="">Todos os períodos</option>
                            <option value="matutino">Matutino</option>
                            <option value="vespertino">Vespertino</option>
                            <option value="noturno">Noturno</option>
                        </select>
                    </label>

                    <label className="filtro-field">
                        <span>Status</span>
                        <select name="status" defaultValue="">
                            <option value="">Todos os status</option>
                            <option value="ativa">Ativa</option>
                            <option value="inativa">Inativa</option>
                        </select>
                    </label>
                </form>

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
