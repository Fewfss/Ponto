import React, { useState } from 'react';
import Logo from './Logo.jsx';
import Menu from './Menu.jsx';
import '../styles/NavBar.css';

const NavBar = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <nav className="navbar">
                <div className="navbar-logo">
                    <Logo />
                </div>

                <div
                    className="navbar-dots"
                    onClick={() => setMenuOpen(true)}
                >
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                </div>
            </nav>

            {menuOpen && (
                <Menu onClose={() => setMenuOpen(false)} />
            )}
        </>
    );
};

export default NavBar;