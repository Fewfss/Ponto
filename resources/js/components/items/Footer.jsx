import React, { useState } from 'react';
import Logo from './Logo.jsx';
import '../styles/Footer.css';

const Footer = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <footer className="footer">
                <div className="footer-logo">
                    <Logo />
                </div>

                <div
                    className="footer-links"
                    onClick={() => setMenuOpen(true)}
                >
                    <span href="/folha">Gerenciamento de Folhas</span>
                    <span href="/grade-horaria">Gerenciamento de Grades</span>
                </div>
                <div
                    className="footer-team"
                    onClick={() => setMenuOpen(true)}
                >
                    <span>Equipe & Projeto</span>
                </div>
            </footer>
        </>
    );
};

export default Footer;