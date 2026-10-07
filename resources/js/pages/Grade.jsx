import { useState } from "react";
import { Head } from "@inertiajs/react";
import NavBar from "../components/items/NavBar.jsx";
import Filtro from "../components/items/Filtro.jsx";
import Toolbar from "../components/items/Toolbar.jsx";
import SearchBar from "../components/items/SearchBar.jsx";
import FilterButton from "../components/items/FilterButton.jsx";
import ActionButton from "../components/items/ActionButton.jsx";
import { IconImport } from "../components/items/Icons.jsx";
import "../components/styles/Grade.css";

const PERIODOS = [
    { id: "manha", label: "Manhã", time: "08:00 – 09:40" },
    { id: "tarde", label: "Tarde", time: "14:00 – 15:40" },
    { id: "noite", label: "Noite", time: "19:00 – 20:40" },
];

const DIAS = [
    { id: "segunda", label: "Segunda" },
    { id: "terca", label: "Terça" },
    { id: "quarta", label: "Quarta" },
    { id: "quinta", label: "Quinta" },
    { id: "sexta", label: "Sexta" },
    { id: "sabado", label: "Sábado" },
];

// Dados de exemplo: em quais períodos/dias existe aula.
const temAula = (periodId, dayId) =>
    (periodId === "noite" && ["segunda", "quarta", "sexta"].includes(dayId)) ||
    (periodId === "tarde" && dayId === "terca") ||
    (periodId === "manha" && dayId === "sabado");

// Cartão de aula, usado tanto na tabela quanto na lista por dia.
// Na tabela o horário aparece no cartão; na lista ele já vem ao lado, então showTime={false}.
const AulaCard = ({ periodo, showTime = true }) => (
    <div className="planner-class">
        {showTime && (
            <div className="planner-class-time">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                </svg>
                <span>{periodo.time}</span>
            </div>
        )}
        <strong>OP: 111</strong>
        <span>Espanhol</span>
        <span>89261</span>
    </div>
);

const Grade = () => {
    const [busca, setBusca] = useState("");
    const [filtroOpen, setFiltroOpen] = useState(false);

    return (
        <div className="grade-page">
            <Head title="Grade horária" />
            <NavBar />

            <main id="conteudo" tabIndex={-1} className="grade-content">
                <Toolbar>
                    <SearchBar value={busca} onChange={(e) => setBusca(e.target.value)} />
                    <FilterButton onClick={() => setFiltroOpen(true)} />
                    <ActionButton variant="light" icon={<IconImport />}>
                        Importar
                    </ActionButton>
                </Toolbar>

                {filtroOpen && <Filtro onClose={() => setFiltroOpen(false)} />}

                <div className="div-container-table">
                    <section className="grade-data-section" aria-labelledby="grade-data-title">
                        <h1 id="grade-data-title">Dados da grade</h1>
                        <dl className="grade-data-grid">
                            <div><dt>Semestre</dt><dd>2º semestre de 2026</dd></div>
                            <div><dt>Validade início</dt><dd>03/08/2026</dd></div>
                            <div><dt>Validade fim</dt><dd>19/12/2026</dd></div>
                            <div><dt>Matrícula</dt><dd>202612345</dd></div>
                            <div><dt>Nome</dt><dd>Mariana Oliveira Santos</dd></div>
                            <div><dt>CPF</dt><dd>123.456.789-00</dd></div>
                            <div><dt>Contrato</dt><dd>CT-2026-00892</dd></div>
                        </dl>
                    </section>

                    <section className="grade-data-section" aria-labelledby="class-data-title">
                        <h2 id="class-data-title">Horário de aulas</h2>
                        <dl className="grade-data-grid class-data-grid">
                            <div><dt>Disciplina / Projeto</dt><dd>Projeto Integrador II</dd></div>
                            <div><dt>Curso</dt><dd>Desenvolvimento de Software Multiplataforma</dd></div>
                            <div><dt>Período</dt><dd>Noturno</dd></div>
                            <div><dt>Status</dt><dd><span className="grade-status">Ativa</span></dd></div>
                        </dl>
                    </section>

                    <section className="grade-planner-section" aria-labelledby="planner-title">
                        <h2 id="planner-title">Grade Horaria</h2>

                        {/* Telas largas: tabela período x dia da semana */}
                        <div className="grade-planner-scroll">
                            <table className="grade-planner">
                                <thead>
                                    <tr>
                                        <th scope="col">Período</th>
                                        {DIAS.map((dia) => (
                                            <th key={dia.id} scope="col">{dia.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {PERIODOS.map((periodo) => (
                                        <tr key={periodo.id}>
                                            <th scope="row" className="planner-period">
                                                {periodo.label}
                                                <span>{periodo.time}</span>
                                            </th>
                                            {DIAS.map((dia) => (
                                                <td key={dia.id}>
                                                    {temAula(periodo.id, dia.id) && <AulaCard periodo={periodo} />}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Telas pequenas: um cartão por dia, sem rolagem lateral */}
                        <ul className="planner-days" role="list">
                            {DIAS.map((dia) => {
                                const aulas = PERIODOS.filter((periodo) => temAula(periodo.id, dia.id));

                                return (
                                    <li key={dia.id} className="planner-day">
                                        <h3>{dia.label}</h3>
                                        {aulas.length > 0 ? (
                                            aulas.map((periodo) => (
                                                <div key={periodo.id} className="planner-day-item">
                                                    <div className="planner-day-when">
                                                        <strong>{periodo.label}</strong>
                                                        <span>{periodo.time}</span>
                                                    </div>
                                                    <AulaCard periodo={periodo} showTime={false} />
                                                </div>
                                            ))
                                        ) : (
                                            <p className="planner-day-empty">Sem aulas</p>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                </div>


            </main>
        </div>
    );
};

export default Grade;
