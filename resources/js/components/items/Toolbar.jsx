import "../styles/Toolbar.css";

// Linha de ações no topo das páginas (busca + botões). Quebra de linha automática no celular.
export default function Toolbar({ children, className = "" }) {
    return <div className={`toolbar ${className}`.trim()}>{children}</div>;
}
