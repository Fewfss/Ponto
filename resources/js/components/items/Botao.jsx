import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../styles/Botao.css";

const SHORT_WAY = 0.15;
//  tempo máximo para o anel terminar a ondinha depois da saída.
const PULSE_FALLBACK_MS = 1600;

export default function BotaoGerenciar({ children = "Gerenciar", ...props }) {
  const ref = useRef(null);
  const dotRef = useRef(null);
  const startRef = useRef(78);
  const [start, setStart] = useState(78);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const { width: w, height: h } = el.getBoundingClientRect();
      if (!w || !h) return;
      const perimeter = 2 * (w - h) + Math.PI * h;
      const topEdge = w - h;
      const value = (topEdge / perimeter) * 100;
      startRef.current = value;
      setStart(value);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    const dot = dotRef.current;
    if (!el || !dot) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const input = { hover: false, focus: false };
    let active = false;
    let settle = null;
    let pulseTimer = 0;

    const orbitMs = () =>
      (parseFloat(getComputedStyle(el).getPropertyValue("--bg-orbit-time")) || 2.2) * 1000;

    const progress = () => {
      const raw = getComputedStyle(dot).offsetDistance;
      const current = parseFloat(raw);
      if (Number.isNaN(current) || !String(raw).endsWith("%")) return 0;
      return ((((current - startRef.current) % 100) + 100) % 100) / 100;
    };

    const heat = () => {
      if (active) return;
      active = true;
      clearTimeout(pulseTimer);

      const p = progress();
      if (settle) {
        settle.cancel();
        settle = null;
      }
      dot.style.setProperty("--bg-orbit-delay", `${-p * orbitMs()}ms`);
      el.classList.add("is-orbiting", "is-pulsing");
    };

    const cool = () => {
      if (!active) return;
      active = false;

      if (!reduceMotion.matches && dot.animate) {
        const s = startRef.current;
        const p = progress();
        const from = s + p * 100;
        const to = p < SHORT_WAY ? s : s + 100; // s e s+100 são o mesmo ponto (caminho fechado)
        const speed = 100 / orbitMs(); // % do caminho por ms durante a órbita
        const duration = Math.min(1500, Math.max(450, (Math.abs(to - from) / speed) * 1.3));

        const anim = dot.animate(
          [{ offsetDistance: `${from}%` }, { offsetDistance: `${to}%` }],
          { duration, easing: "ease-out" }
        );
        anim.onfinish = () => {
          if (settle === anim) settle = null;
        };
        settle = anim;
      }

      el.classList.remove("is-orbiting");
      // o anel para ao fim da ondinha atual (onAnimationIteration); este timer é só segurança
      pulseTimer = setTimeout(() => el.classList.remove("is-pulsing"), PULSE_FALLBACK_MS);
    };

    const sync = () => (input.hover || input.focus ? heat() : cool());
    const onEnter = () => { input.hover = true; sync(); };
    const onLeave = () => { input.hover = false; sync(); };
    const onFocus = () => { input.focus = el.matches(":focus-visible"); sync(); };
    const onBlur = () => { input.focus = false; sync(); };
    const onIteration = (e) => {
      if (!active && e.pseudoElement === "::after") {
        clearTimeout(pulseTimer);
        el.classList.remove("is-pulsing");
      }
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    el.addEventListener("animationiteration", onIteration);

    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
      el.removeEventListener("animationiteration", onIteration);
      clearTimeout(pulseTimer);
      if (settle) settle.cancel();
    };
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      className="bg-btn"
      style={{ "--bg-start": `${start}%` }}
      {...props}
    >
      <span className="bg-btn__label">{children}</span>
      <span ref={dotRef} className="bg-btn__dot" aria-hidden="true" />
    </button>
  );
}
