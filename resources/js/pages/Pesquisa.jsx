import { Head } from "@inertiajs/react";
import CardAvaliacao from "../components/items/CardAvaliacao";
import "../components/styles/Pesquisa.css";
import NavBar from "../components/items/NavBar.jsx";

export default function Pesquisa() {
  async function handleSubmit({ nota, comentario }) {
    console.log("Avaliação enviada:", { nota, comentario });
  }

  return (
      <div className="avaliacao-page">
          <Head title="Pesquisa de Satisfação" />
          <NavBar/>
      <main className="avaliacao-main">
        <CardAvaliacao onSubmit={handleSubmit} />
      </main>
    </div>

  );
}
