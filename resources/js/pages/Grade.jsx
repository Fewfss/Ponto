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
                        <div className="grade-planner-scroll">
                            <table className="grade-planner">
                                <thead>
                                    <tr>
                                        <th scope="col">Período</th>
                                        <th scope="col">Segunda</th>
                                        <th scope="col">Terça</th>
                                        <th scope="col">Quarta</th>
                                        <th scope="col">Quinta</th>
                                        <th scope="col">Sexta</th>
                                        <th scope="col">Sábado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { id: "manha", label: "Manhã", time: "08:00 – 09:40" },
                                        { id: "tarde", label: "Tarde", time: "14:00 – 15:40" },
                                        { id: "noite", label: "Noite", time: "19:00 – 20:40" },
                                    ].map((period) => (
                                        <tr key={period.id}>
                                            <th scope="row" className="planner-period">
                                                {period.label}
                                                <span>{period.time}</span>
                                            </th>
                                            {["segunda", "terca", "quarta", "quinta", "sexta", "sabado"].map((day) => {
                                                const hasClass =
                                                    (period.id === "noite" && ["segunda", "quarta", "sexta"].includes(day)) ||
                                                    (period.id === "tarde" && day === "terca") ||
                                                    (period.id === "manha" && day === "sabado");

                                                return (
                                                    <td key={day}>
                                                        {hasClass && (
                                                            <div className="planner-class">
                                                                <div className="planner-class-time">
                                                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                                                        <circle cx="12" cy="12" r="9" />
                                                                        <path d="M12 7v5l3 2" />
                                                                    </svg>
                                                                    <span>{period.time}</span>
                                                                </div>
                                                                <strong>OP: 111</strong>
                                                                <span>Espanhol</span>
                                                                <span>89261</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>


            </main>
        </div>
    );
};

export default Grade;
