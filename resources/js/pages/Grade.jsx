import React from "react";
import NavBar from "../components/items/NavBar.jsx";
import Card from "../components/items/Card.jsx";
import "../components/styles/Home.css";

const Home = () => {
    return (
        <div className="home">
            <NavBar />

            <main className="home-content">
                <div className="home-cards">
                   <h1>Bem-vindo ao Sistema de Ponto</h1>
                </div>
            </main>
        </div>
    );
};

export default Grade;