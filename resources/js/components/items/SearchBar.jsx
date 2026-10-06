import { IconSearch } from "./Icons.jsx";
import "../styles/Toolbar.css";

export default function SearchBar({
    value,
    onChange,
    placeholder = "Pesquise a grade aqui..",
    label = "Pesquisar grade",
}) {
    return (
        <label className="search-bar">
            <input
                type="search"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                aria-label={label}
            />
            <IconSearch />
        </label>
    );
}
