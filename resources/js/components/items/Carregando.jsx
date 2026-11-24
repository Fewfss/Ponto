import { useEffect, useRef } from "react";
import gsap from "gsap";
import "../styles/Carregando.css";

const FASES = [".", "!", "ponto", "?"];
const QTD = 3; // pontos por fase
const ESCALONAMENTO = 0.2; 
const PAUSA_ENTRE_FASES = 0.55;

function Carregando({ rotulo = "Carregando…" }) {
  const raizRef = useRef(null);
  const espacosRef = useRef([]); // wrapper de cada ponto (anima a largura)
  const glifosRef = useRef([]); // texto de cada ponto (anima o pulo)

  useEffect(() => {
    const espacos = espacosRef.current.filter(Boolean);
    const glifos = glifosRef.current.filter(Boolean);
    if (espacos.length !== QTD || glifos.length !== QTD) return undefined;

    const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const definirTexto = (indice, texto, animar = true) => {
      const espaco = espacos[indice];
      const glifo = glifos[indice];
      if (glifo.textContent === texto) return;

      const larguraAntes = espaco.offsetWidth;
      glifo.textContent = texto;
      gsap.set(espaco, { clearProps: "width" });
      const larguraDepois = espaco.offsetWidth;

      if (animar && larguraAntes !== larguraDepois) {
        gsap.fromTo(
          espaco,
          { width: larguraAntes },
          { width: larguraDepois, duration: 0.25, ease: "power2.out", clearProps: "width" }
        );
      }
    };

    const ctx = gsap.context(() => {
      glifos.forEach((_, i) => definirTexto(i, FASES[0], false));
      gsap.set(glifos, { opacity: 0, y: 0, scaleX: 1, scaleY: 1, transformOrigin: "50% 100%" });

      const mestre = gsap.timeline({ repeat: -1 });

      if (reduzirMovimento) {
        // sem pulos: só troca as fases com um fade suave
        FASES.forEach((texto) => {
          mestre.call(() => glifos.forEach((_, i) => definirTexto(i, texto, false)));
          mestre.to(glifos, { opacity: 1, duration: 0.3, stagger: 0.12 });
          mestre.to(glifos, { opacity: 1, duration: 0.6 }); // pausa
          mestre.to(glifos, { opacity: 0, duration: 0.25 });
        });
        return;
      }

      glifos.forEach((glifo, i) => {
        mestre.add(entrar(glifo), i * ESCALONAMENTO);
      });

      // 2) cada fase seguinte: cada ponto pula e troca de símbolo lá no alto
      FASES.slice(1).forEach((texto) => {
        const inicio = `+=${PAUSA_ENTRE_FASES}`;
        glifos.forEach((glifo, i) => {
          mestre.add(
            pularETrocar(glifo, () => definirTexto(i, texto)),
            i === 0 ? inicio : `<${ESCALONAMENTO}`
          );
        });
      });

      mestre.to(glifos, {
        opacity: 0,
        scaleX: 0.6,
        scaleY: 0.6,
        duration: 0.2,
        stagger: 0.08,
        ease: "power1.in",
        delay: 0.7,
      });
      mestre.call(() => glifos.forEach((_, i) => definirTexto(i, FASES[0], false)));
      mestre.to({}, { duration: 0.25 }); // respiro antes de recomeçar
    }, raizRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="carregando" ref={raizRef} role="status" aria-live="polite">
      <span className="sr-only">{rotulo}</span>

      <div className="carregando__pontos" aria-hidden="true">
        {Array.from({ length: QTD }, (_, i) => (
          <span
            className="carregando__espaco"
            key={i}
            ref={(el) => {
              espacosRef.current[i] = el;
            }}
          >
            <span
              className="carregando__glifo"
              ref={(el) => {
                glifosRef.current[i] = el;
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

function entrar(alvo) {
  return gsap
    .timeline()
    .fromTo(
      alvo,
      { opacity: 0, y: "-0.9em", scaleX: 0.75, scaleY: 1.3 },
      { opacity: 1, y: 0, duration: 0.24, ease: "power2.in" }
    )
    .to(alvo, { scaleX: 1.4, scaleY: 0.6, duration: 0.08, ease: "power2.out" }) // amassa
    .to(alvo, { scaleX: 0.88, scaleY: 1.18, y: "-0.28em", duration: 0.14, ease: "power2.out" }) // estica
    .to(alvo, { scaleX: 1, scaleY: 1, y: 0, duration: 0.32, ease: "bounce.out" }); // volta pra posição
}

function pularETrocar(alvo, trocar) {
  return gsap
    .timeline()
    .to(alvo, { scaleX: 1.25, scaleY: 0.75, duration: 0.08, ease: "power1.out" }) // agacha
    .to(alvo, { scaleX: 0.85, scaleY: 1.2, y: "-0.65em", duration: 0.2, ease: "power2.out" }) // sobe
    .call(trocar) // no alto
    .to(alvo, { scaleX: 1, scaleY: 1, y: 0, duration: 0.2, ease: "power2.in" }) // desce
    .to(alvo, { scaleX: 1.4, scaleY: 0.6, duration: 0.07, ease: "power2.out" }) // amassa
    .to(alvo, { scaleX: 1, scaleY: 1, y: 0, duration: 0.3, ease: "bounce.out" }); // volta pra posição
}

export default Carregando;