import "../styles/Toolbar.css";

// Botão em pílula. variant: "dark" (padrão) | "light".
// icon: elemento SVG opcional. badge: número exibido ao lado (ex.: filtros ativos).
export default function ActionButton({
    variant = "dark",
    icon,
    badge = 0,
    className = "",
    children,
    ...props
}) {
    return (
        <button
            type="button"
            className={`action-btn action-btn--${variant} ${className}`.trim()}
            {...props}
        >
            {icon}
            {children}
            {badge > 0 && <span className="action-btn__badge">{badge}</span>}
        </button>
    );
}
