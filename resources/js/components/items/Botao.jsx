import { useLayoutEffect, useRef, useState } from "react";
import "../styles/Botao.css";

export default function BotaoGerenciar({ children = "Gerenciar", ...props }) {
  const ref = useRef(null);
  const [start, setStart] = useState(78);

  // Calcula onde o ponto "descansa" (início da curva direita, no topo)
  // como % do perímetro do pill, para a animação começar e terminar ali.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const { width: w, height: h } = el.getBoundingClientRect();
      if (!w || !h) return;
      const perimeter = 2 * (w - h) + Math.PI * h;
      const topEdge = w - h; // reta superior (entre as curvas)
      setStart((topEdge / perimeter) * 100);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
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
      <span className="bg-btn__dot" aria-hidden="true" />
    </button>
  );
}