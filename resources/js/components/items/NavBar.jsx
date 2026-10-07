import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import Logo from './Logo.jsx';
import Menu from './Menu.jsx';
import '../styles/NavBar.css';

const NavBar = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>

            <header className="navbar">
                <div className="navbar-logo">
                    <Link href="/" aria-label="Ir para a página inicial">
                        <Logo />
                    </Link>
                </div>

                <button
                    type="button"
                    className="navbar-dots"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Abrir menu"
                    aria-haspopup="dialog"
                    aria-expanded={menuOpen}
                >
                    <span aria-hidden="true">.</span>
                    <span aria-hidden="true">.</span>
                    <span aria-hidden="true">.</span>
                </button>
            </header>

            {menuOpen && (
                <Menu onClose={() => setMenuOpen(false)} />
            )}
        </>
    );
};

export default NavBar;
