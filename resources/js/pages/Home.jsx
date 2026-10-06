import React from "react";
import NavBar from "../components/items/NavBar.jsx";
import Card from "../components/items/Card.jsx";
import Footer from "../components/items/Footer.jsx";
import "../components/styles/Home.css";

const Home = () => {
    return (
        <div className="home">
            <NavBar />

            <main className="home-content">
                <div className="home-cards">
                    <Card
                        icon={
                            <svg
                                viewBox="0 0 48 48"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <rect
                                    x="11"
                                    y="6"
                                    width="26"
                                    height="36"
                                    rx="2"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                />

                                <path
                                    d="M29 6V15H37"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                />

                                <path
                                    d="M17 21H31"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />

                                <path
                                    d="M17 27H31"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />

                                <path
                                    d="M17 33H26"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        }
                        title={
                            <>
                                Gerenciamento
                                <br />
                                de folhas
                            </>
                        }
                        description={
                            <>
                                Aqui você pode gerenciar
                                <br />
                                suas folhas de <strong>ponto.</strong>
                            </>
                        }
                    />

                    <Card
                        icon={
                            <svg
                                viewBox="0 0 48 48"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <rect
                                    x="9"
                                    y="11"
                                    width="30"
                                    height="29"
                                    rx="2"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                />

                                <path
                                    d="M9 19H39"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                />

                                <path
                                    d="M16 7V14"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />

                                <path
                                    d="M32 7V14"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        }
                        title={
                            <>
                                Gerenciamento
                                <br />
                                de grades
                            </>
                        }
                        description={
                            <>
                                Aqui você pode gerenciar
                                <br />
                                suas grades horárias.
                            </>
                        }
                    />
                </div>

            </main>
        </div>
    );
};

export default Home;