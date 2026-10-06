// Ícones compartilhados. O tamanho é definido pelo CSS de quem os usa (SearchBar, ActionButton).
const Svg = ({ children }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);

export const IconSearch = () => (
    <Svg><circle cx="11" cy="11" r="7.5" /><path d="m20 20-3.6-3.6" /></Svg>
);
export const IconFilter = () => (
    <Svg><path d="M3 4.5h18l-7 8.5v6l-4 1.5V13z" /></Svg>
);
export const IconNewDoc = () => (
    <Svg><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M12 11v6M9 14h6" /></Svg>
);
export const IconPen = () => (
    <Svg><path d="M12 19l7-7-4-4-7 7v4z" /><path d="m15 8-1-5L4 6l4.5 4.5" /><path d="M3 21l5-5" /></Svg>
);
export const IconImport = () => (
    <Svg><path d="M12 3v12m0 0-4-4m4 4 4-4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></Svg>
);
export const IconFile = () => (
    <Svg><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></Svg>
);
