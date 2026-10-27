import CardAvaliacao from "../components/items/CardAvaliacao";
import "../components/styles/Pesquisa.css";
import "../components/items/NavBar.jsx";
import NavBar from "../components/items/NavBar.jsx";
import Footer from "../components/items/Footer.jsx";

export default function Pesquisa() {
  async function handleSubmit({ nota, comentario }) {
    console.log("Avaliação enviada:", { nota, comentario });
  }

  return (
    <div className="avaliacao-page">
      <header className="avaliacao-header">
        <NavBar/>
      </header>

      <main className="avaliacao-main">
        <CardAvaliacao onSubmit={handleSubmit} />
      </main>
      <Footer/>
    </div>
    
  );
}