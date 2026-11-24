import { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import Carregando from "./Carregando.jsx";
import { inscrever, totalRequisicoes } from "../../utils/carregamento.js";

// mostra a tela de carregamento na troca de página (Inertia) e em chamadas à API
function CarregandoNavegacao() {
  const [navegando, setNavegando] = useState(false);
  const [requisicoes, setRequisicoes] = useState(totalRequisicoes());

  useEffect(() => {
    const removerInicio = router.on("start", () => setNavegando(true));
    const removerFim = router.on("finish", () => setNavegando(false));
    const removerInscricao = inscrever(setRequisicoes);

    return () => {
      removerInicio();
      removerFim();
      removerInscricao();
    };
  }, []);

  return navegando || requisicoes > 0 ? <Carregando /> : null;
}

export default CarregandoNavegacao;