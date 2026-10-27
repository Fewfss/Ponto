import { useState } from "react";
import { Head } from "@inertiajs/react";
import NavBar from "../components/items/NavBar.jsx";
import Footer from "../components/items/Footer.jsx";
import "../components/styles/Equipe.css";

/*
  A ordem do array é a ordem na tela, da esquerda para a direita:
  back-end nas pontas, front-end ao lado e integração no meio.

  Fotos: coloque em public/images/equipe/ e ajuste o caminho em "foto".
  LinkedIn: troque o "#" pelo link do perfil de cada pessoa.
*/
const EQUIPE = [
  {
    nome: "Guilherme",
    cargo: "Desenvolvedor \n Back-end",
    foto: "/images/equipe/guilherme.jpg",
    linkedin: "https://www.linkedin.com/in/guilhermesouzaduarte/",
  },
  {
    nome: "Gabrielly",
    cargo: "Desenvolvedora \n Front-end",
    foto: "/images/equipe/gabrielly.jpg",
    linkedin: "https://www.linkedin.com/in/gabrielly-souza-vasconcelos/",
  },
  {
    nome: "Luis",
    cargo: "Desenvolvedor de Integração Front-end e Back-end",
    foto: "/images/equipe/luis.jpg",
    linkedin: "https://www.linkedin.com/in/luis-felipe-ferreira-honrado-182b50344/",
  },
  {
    nome: "Isabella",
    cargo: "Desenvolvedora \n Front-end",
    foto: "/images/equipe/isabella.png",
    linkedin: "https://www.linkedin.com/in/isabella-grorossi-muniz/",
  },
  {
    nome: "Henrique",
    cargo: "Desenvolvedor \n Back-end e Front-end",
    foto: "/images/equipe/henrique.jpeg",
    linkedin: "https://www.linkedin.com/in/henrique-gustavo-lopes-ribeiro/",
  },
];

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function Membro({ nome, cargo, foto, linkedin }) {
  const [fotoFalhou, setFotoFalhou] = useState(false);

  return (
    <li className="equipe-membro">
      <div className="equipe-foto" tabIndex={0}>
        {foto && !fotoFalhou ? (
          <img
            src={foto}
            alt={`Foto de ${nome}`}
            onError={() => setFotoFalhou(true)}
          />
        ) : (
          <span className="equipe-foto__inicial" aria-hidden="true">
            {nome.charAt(0)}
          </span>
        )}

        <div className="equipe-foto__info">
          <strong>{nome}</strong>
          <span>{cargo}</span>
        </div>
      </div>

      <a
        className="equipe-linkedin"
        href={linkedin}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`LinkedIn de ${nome}`}
      >
        <LinkedInIcon />
      </a>
    </li>
  );
}

export default function Equipe() {
  return (
    <div className="equipe-page">
      <Head title="Equipe & Projeto" />
      <NavBar />

      <main className="equipe-main">
        <section className="equipe-projeto">
          <h1>
            Sobre o <span>ponto.</span>
          </h1>

          <p>
            O <strong>ponto.</strong> nasceu de uma demanda do Leonardo, na
            FATEC. Preencher a folha de ponto dos professores era um processo
            muito demorado, e o cansaço do preenchimento manual acabava gerando
            muitos erros. Criamos o projeto para otimizar a criação dessas
            folhas e facilitar a vida dos dois lados, tanto a do Leonardo
            quanto a dos professores.
          </p>

          <p>
            Na plataforma é possível importar as grades horárias e a folha de
            ponto, e depois exportar a folha já pronta, com os dias em que o
            professor não pode preencher marcados em um tom mais escuro. Assim
            o preenchimento fica mais rápido, mais claro e com bem menos
            chance de erro.
          </p>
        </section>

        <section className="equipe-time">
          <h2>Equipe</h2>

          <ul className="equipe-lista">
            {EQUIPE.map((pessoa) => (
              <Membro key={pessoa.nome} {...pessoa} />
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}