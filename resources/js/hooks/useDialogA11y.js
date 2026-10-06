import { useEffect, useRef } from "react";

const FOCAVEIS =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Acessibilidade para diálogos (modal, menu lateral, painel de filtros):
// - leva o foco para dentro ao abrir e devolve para o botão que abriu ao fechar
// - mantém o Tab/Shift+Tab preso dentro do diálogo
// - fecha com Esc
// O elemento do `ref` precisa ter tabIndex={-1} (usado se não houver nada focável).
export default function useDialogA11y(ref, onClose) {
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose; // evita reexecutar o efeito (e roubar o foco) a cada render

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const abriuDe = document.activeElement;

        const focaveis = () =>
            [...el.querySelectorAll(FOCAVEIS)].filter((n) => n.getClientRects().length > 0);

        (focaveis()[0] ?? el).focus();

        const onKey = (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (e.key !== "Tab") return;

            const itens = focaveis();
            if (itens.length === 0) return e.preventDefault();
            const primeiro = itens[0];
            const ultimo = itens[itens.length - 1];

            if (e.shiftKey && document.activeElement === primeiro) {
                e.preventDefault();
                ultimo.focus();
            } else if (!e.shiftKey && document.activeElement === ultimo) {
                e.preventDefault();
                primeiro.focus();
            }
        };

        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            abriuDe?.focus?.();
        };
    }, [ref]);
}
