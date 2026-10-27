import { useEffect, useRef } from "react";
import useDialogA11y from "../../hooks/useDialogA11y.js";
import "../styles/Modal.css";

export default function Modal({ titulo, descricao, children, rodape, onClose, className = "" }) {
    const dialogRef = useRef(null);
    useDialogA11y(dialogRef, onClose);

    useEffect(() => {
        const anterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = anterior; };
    }, []);

    return (
        <div className="modal-overlay" onMouseDown={onClose}>
            <div className={`modal ${className}`.trim()} ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo}
                 onMouseDown={(e) => e.stopPropagation()}>
                <header className="modal-head">
                    <h2>{titulo}</h2>
                    {descricao && <p>{descricao}</p>}
                </header>
                <div className="modal-body">{children}</div>
                <footer className="modal-foot">{rodape}</footer>
            </div>
        </div>
    );
}
