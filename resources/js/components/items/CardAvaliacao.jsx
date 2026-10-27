import { useId, useState } from "react";
import "../styles/CardAvaliacao.css";
import Botao from "../items/Botao";

const STAR_PATH =
  "M12 2.8l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9L12 2.8z";

const LABELS = ["Péssimo", "Ruim", "Regular", "Bom", "Excelente"];
const MAX_CHARS = 500;

function StarIcon({ active, gradientId }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="avaliacao-star-icon"
      fill={active ? `url(#${gradientId})` : "#1c1c1c"}
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

export default function AvaliacaoCard({ onSubmit }) {
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // useId gera ":" no valor, o que atrapalha o url(#id) do SVG
  const gradientId = "silver-" + useId().replace(/:/g, "");

  const valorVisivel = hover || nota;

  async function handleEnviar() {
    if (!nota) {
      setErro("Escolha uma nota de 1 a 5 estrelas antes de enviar.");
      return;
    }

    setEnviando(true);
    try {
      await onSubmit?.({ nota, comentario: comentario.trim() });
      setEnviado(true);
    } catch (e) {
      setErro("Não foi possível enviar sua avaliação. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className={`avaliacao-card ${enviado ? "avaliacao-card--enviado" : ""}`}>
      {/* Gradiente prata compartilhado pelas estrelas */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#d9d9d9" />
            <stop offset="60%" stopColor="#f2f2f2" />
            <stop offset="100%" stopColor="#8e8e8e" />
          </linearGradient>
        </defs>
      </svg>

      <div className="avaliacao-card__icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        >
          <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />
        </svg>
      </div>

      {enviado ? (
        <div>
          <h2>Obrigado pela sua avaliação</h2>
          <p>
            Sua opinião ajuda a deixar o <strong>ponto.</strong> cada vez melhor.
          </p>
          <div className="avaliacao-stars avaliacao-stars--readonly">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={`avaliacao-star ${i <= nota ? "avaliacao-star--active" : ""}`}
              >
                <StarIcon active={i <= nota} gradientId={gradientId} />
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h2>Avalie sua experiência</h2>
          <p>
            Conta pra gente como foi usar o <strong>ponto.</strong>
          </p>

          <div
            className="avaliacao-stars"
            role="radiogroup"
            aria-label="Nota de 1 a 5"
            onMouseLeave={() => setHover(0)}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={nota === i}
                aria-label={`${i} ${i === 1 ? "estrela" : "estrelas"}`}
                className={`avaliacao-star ${i <= valorVisivel ? "avaliacao-star--active" : ""}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(0)}
                onClick={() => {
                  setNota(i);
                  setErro("");
                }}
              >
                <StarIcon active={i <= valorVisivel} gradientId={gradientId} />
              </button>
            ))}
          </div>

          <p className="avaliacao-card__rating-label">
            {valorVisivel ? LABELS[valorVisivel - 1] : ""}
          </p>

          <label className="avaliacao-card__field-label" htmlFor="avaliacao-comentario">
            Quer deixar um comentário?
          </label>
          <textarea
            id="avaliacao-comentario"
            className="avaliacao-card__textarea"
            maxLength={MAX_CHARS}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Escreva aqui o que você achou, o que gostou e o que podemos melhorar."
          />
          <div className="avaliacao-card__counter">
            {comentario.length}/{MAX_CHARS}
          </div>

          <p className="avaliacao-card__error" role="alert">
            {erro}
          </p>

            <div className="avaliacao-card__action">
            <Botao onClick={handleEnviar} disabled={enviando}>
                {enviando ? "Enviando..." : "Enviar"}
            </Botao>
            </div>
        </div>
      )}
    </section>
  );
}