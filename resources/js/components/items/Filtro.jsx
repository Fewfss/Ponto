import React from "react";
import Logo from "./Logo.jsx";
import "../styles/Filtro.css";

function Filtro({ onClose }) {
    return (
        <div className="menu-overlay">
            <div className="menu">
                <button
                    className="menu-close"
                    onClick={onClose}
                >
                    ×
                </button>

                <h1 className="filtro-title">
                    <svg
                        viewBox="0 0 24 24"
                        className="filtro-title-icon"
                        aria-hidden="true"
                    >
                        <path d="M4 7h16M7 12h10m-7 5h4" />
                    </svg>
                    Filtros
                </h1>

                <form className="filtro-fields">
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
                            {[1, 2, 3, 4, 5, 6].map((semestre) => (
                                <option key={semestre} value={semestre}>
                                    {semestre}º semestre
                                </option>
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

                <div className="menu-logo">
                    <div className="menu-logo-scale">
                        <Logo />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Filtro;    