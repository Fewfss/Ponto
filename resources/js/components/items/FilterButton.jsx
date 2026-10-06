import ActionButton from "./ActionButton.jsx";
import { IconFilter } from "./Icons.jsx";

// Botão "Filtros" padrão. count = quantidade de filtros ativos (mostra a bolinha).
export default function FilterButton({ count = 0, children = "Filtros", ...props }) {
    return (
        <ActionButton icon={<IconFilter />} badge={count} {...props}>
            {children}
        </ActionButton>
    );
}
