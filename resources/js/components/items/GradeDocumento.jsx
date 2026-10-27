import { DIAS, PERIODOS, HAE_RJI, dataBR, totais, fmtNum } from "../../data/gradesMock.js";
import "../styles/GradeDocumento.css";


const aulasDoDia = (grade, periodo, dia) =>
    grade.aulas
        .filter((a) => a.periodo === periodo && a.dia === dia)
        .sort((a, b) => a.inicio.localeCompare(b.inicio));

function Slot({ aula, matricula, comHorario = true }) {
    return (
        <div className="gd-slot">
            {comHorario && <span className="gd-slot-time">{aula.inicio} | {aula.fim}</span>}
            <span>OP:111</span>
            <strong>{aula.disciplina}</strong>
            <span className="gd-slot-mat">{matricula}</span>
        </div>
    );
}

function QuadroPeriodo({ grade, periodo }) {
    return (
        <div className="gd-periodo">
            <h3 className="gd-periodo-titulo">{periodo.label}</h3>
            <div className="gd-scroll">
                <table className="gd-table gd-week">
                    <caption className="sr-only">Aulas do período da {periodo.label.toLowerCase()}</caption>
                    <thead>
                        <tr>
                            {DIAS.map((d) => <th key={d.id} scope="col">{d.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            {DIAS.map((d) => (
                                <td key={d.id}>
                                    {aulasDoDia(grade, periodo.id, d.id).map((a) => (
                                        <Slot key={a.inicio} aula={a} matricula={grade.matricula} />
                                    ))}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Celular: um cartão por dia, sem rolagem lateral
function ListaPorDia({ grade }) {
    return (
        <ul className="gd-days" role="list">
            {DIAS.map((d) => {
                const aulas = grade.aulas
                    .filter((a) => a.dia === d.id)
                    .sort((a, b) => a.inicio.localeCompare(b.inicio));
                return (
                    <li key={d.id} className="gd-day">
                        <h3>{d.label}</h3>
                        {aulas.length === 0 && <p className="gd-empty">Sem aulas</p>}
                        {aulas.map((a) => (
                            <div key={a.inicio} className="gd-day-item">
                                <div className="gd-day-when">
                                    <strong>{a.periodo}</strong>
                                    <span>{a.inicio} | {a.fim}</span>
                                </div>
                                <Slot aula={a} matricula={grade.matricula} comHorario={false} />
                            </div>
                        ))}
                    </li>
                );
            })}
        </ul>
    );
}

export default function GradeDocumento({ grade }) {
    const t = totais(grade);
    const horasHae = (i) => grade.haeRji[i + 1] ?? "";

    return (
        <div className="gd">
            <p className="gd-unidade">{grade.unidade}</p>

            {/* cabeçalho */}
            <dl className="gd-dados">
                <div><dt>Semestre</dt><dd>{grade.semestre}</dd></div>
                <div><dt>Validade início</dt><dd>{dataBR(grade.validadeInicio)}</dd></div>
                <div><dt>Validade fim</dt><dd>{dataBR(grade.validadeFim)}</dd></div>
                <div><dt>Matrícula</dt><dd>{grade.matricula}</dd></div>
                <div className="gd-nome"><dt>Nome</dt><dd>{grade.nome}</dd></div>
                <div><dt>CPF</dt><dd>{grade.cpf}</dd></div>
                <div><dt>Contrato</dt><dd>{grade.contrato}</dd></div>
            </dl>

            {/* horas-aula */}
            <section aria-labelledby="gd-horas">
                <h2 id="gd-horas" className="gd-secao">Horas Aulas</h2>
                <div className="gd-scroll">
                    <table className="gd-table gd-horas">
                        <thead>
                            <tr>
                                <th scope="col">Disciplina/Projeto</th>
                                <th scope="col">Curso</th>
                                <th scope="col">Período</th>
                                <th scope="col">Status</th>
                                <th scope="col">Qtde</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grade.componentes.map((c) => (
                                <tr key={c.disciplina}>
                                    <td data-label="Disciplina/Projeto" className="gd-disciplina">{c.disciplina}</td>
                                    <td data-label="Curso">{c.curso}</td>
                                    <td data-label="Período">{c.periodo}</td>
                                    <td data-label="Status"><span className="gd-status">{c.status}</span></td>
                                    <td data-label="Qtde">{c.qtde}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* quadro semanal */}
            <section aria-labelledby="gd-semana" className="gd-semana">
                <h2 id="gd-semana" className="gd-secao">Grade semanal</h2>
                <div className="gd-semana-tabela">
                    {PERIODOS.map((p) => <QuadroPeriodo key={p.id} grade={grade} periodo={p} />)}
                </div>
                <ListaPorDia grade={grade} />
            </section>

            {/* HAE-RJI + totais */}
            <div className="gd-rodape-tabelas">
                <section aria-labelledby="gd-hae">
                    <h2 id="gd-hae" className="gd-secao">HAE - RJI</h2>
                    <table className="gd-table gd-hae">
                        <thead>
                            <tr><th scope="col" colSpan={2}>Atividade</th><th scope="col">Horas semanais</th></tr>
                        </thead>
                        <tbody>
                            {HAE_RJI.map((nome, i) => (
                                <tr key={nome}>
                                    <td className="gd-n">{i + 1}</td>
                                    <td>{nome}</td>
                                    <td>{horasHae(i)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <section aria-labelledby="gd-tot">
                    <h2 id="gd-tot" className="gd-secao">Resumo de horas</h2>
                    <table className="gd-table gd-totais">
                        <thead>
                            <tr><th scope="col">V/D</th><th scope="col">Atividade</th><th scope="col">Semanal</th><th scope="col">Mensal</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>002728</td><td>HORA AULA</td><td>{t.semanal}</td><td>{fmtNum(t.mensal)}</td></tr>
                            <tr><td>002713</td><td>HORA ATIVIDADE 50%</td><td></td><td>{fmtNum(t.atividade)}</td></tr>
                        </tbody>
                        <tfoot>
                            <tr><th scope="row" colSpan={2}>Total</th><td>{t.semanal}</td><td>{fmtNum(t.total)}</td></tr>
                        </tfoot>
                    </table>
                </section>
            </div>

            {/* assinaturas */}
            <section aria-labelledby="gd-ass" className="gd-assinaturas">
                <h2 id="gd-ass" className="sr-only">Assinaturas</h2>
                <div className="gd-ass-grid">
                    <Assinatura rotulo="De acordo" nome={grade.assinaturas.coordenadorFatec} funcao="Coordenador de Fatec" />
                    <Assinatura rotulo="De acordo" nome={grade.nome} funcao="Professor" />
                    {grade.assinaturas.chefes.map((c) => (
                        <Assinatura key={c.nome} rotulo="Aprovado" nome={c.nome} funcao={c.funcao} />
                    ))}
                </div>
                <p className="gd-obs"><b>Observações:</b></p>
            </section>
        </div>
    );
}

function Assinatura({ rotulo, nome, funcao }) {
    return (
        <div className="gd-ass">
            <span>{rotulo}: <b>{nome}</b></span>
            <span className="gd-ass-data">Data: ____/____/_______</span>
            <span className="gd-ass-funcao">{funcao}</span>
        </div>
    );
}
