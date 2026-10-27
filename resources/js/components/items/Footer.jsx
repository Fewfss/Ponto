import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import Logo from './Logo.jsx';
import '../styles/Footer.css';

const Footer = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <footer className="footer">
            <div className="footer-logo">
                <Logo />
            </div>

            <div className="footer-links">
                <Link href="/folha">Gerenciamento de Folhas</Link>
                <Link href="/grade-horaria">Gerenciamento de Grades</Link>
                <Link href="/pesquisa">Pesquisa de Satisfação</Link>
            </div>

            <div className="footer-team" onClick={() => setMenuOpen(true)}>
                <Link href="/time">Equipe & Projeto</Link>
            </div>
        </footer>
    );
};

export default Footer;