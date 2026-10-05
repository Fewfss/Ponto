import React, { useState } from "react";
import { Link } from "@inertiajs/react";
import Logo from "./Logo.jsx";
import "../styles/Menu.css";

function Menu({ onClose }) {
    const [hoveredItem, setHoveredItem] = useState("home");

    const handleMouseLeave = () => {
        setHoveredItem("home");
    };

    return (
        <div className="menu-overlay">
            <div className="menu">
                <button
                    className="menu-close"
                    onClick={onClose}
                >
                    ×
                </button>

                <nav
                    className="menu-options"
                    onMouseLeave={handleMouseLeave}
                >
                    <Link
                        href="/"
                        className={`menu-option ${
                            hoveredItem === "home" ? "active" : ""
                        }`}
                        onMouseEnter={() => setHoveredItem("home")}
                        onClick={onClose}
                    >
                        <svg viewBox="0 0 24 24" className="menu-icon">
                            <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5Z" />
                            <path d="M9 22V12h6v10" />
                        </svg>

                        <span>Home</span>
                    </Link>

                    <Link
                        href="/folhas"
                        className={`menu-option ${
                            hoveredItem === "folhas" ? "active" : ""
                        }`}
                        onMouseEnter={() => setHoveredItem("folhas")}
                        onClick={onClose}
                    >
                        <svg viewBox="0 0 24 24" className="menu-icon">
                            <path d="M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
                            <path d="M14 2v6h6" />
                            <path d="M8 13h8" />
                            <path d="M8 17h6" />
                        </svg>

                        <span>Gerenciamento de Folhas</span>
                    </Link>

                    <Link
                        href="/grades"
                        className={`menu-option ${
                            hoveredItem === "grades" ? "active" : ""
                        }`}
                        onMouseEnter={() => setHoveredItem("grades")}
                        onClick={onClose}
                    >
                        <svg viewBox="0 0 24 24" className="menu-icon">
                            <rect x="3" y="5" width="18" height="16" rx="1" />
                            <path d="M16 3v4" />
                            <path d="M8 3v4" />
                            <path d="M3 10h18" />
                        </svg>

                        <span>Gerenciamento de Grades</span>
                    </Link>
                </nav>

                <div className="menu-logo">
                    <div className="menu-logo-scale">
                        <Logo />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Menu;