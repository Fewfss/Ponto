import { router } from "@inertiajs/react";
import Botao from "./Botao.jsx";
import "../styles/Card.css";

const Card = ({
    icon,
    title,
    description,
    buttonText = "Gerenciar",
    href,
}) => {
    return (
        <div className="card">
            <div className="card-icon">
                {icon}
            </div>

            <div className="card-content">
                <h2>{title}</h2>

                <p>{description}</p>

                <Botao onClick={href ? () => router.visit(href) : undefined}>
                    {buttonText}
                </Botao>
            </div>
        </div>
    );
};

export default Card;
