import React from 'react'
import BotaoGerenciar from '../components/items/Botao.jsx';
import Logo from '../components/items/Logo.jsx';
import NavBar from '../components/items/NavBar.jsx';
import Menu from '../components/items/Menu.jsx';
import Card from '../components/items/Card.jsx';
import Botao from '../components/items/Botao.jsx';

const teste = () => {
  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh' }}>

      <div>
        <NavBar />
      </div>

      <div>
        {/* <Menu onClose={() => setMenuOpen(false)} /> */}
      </div>
      
      <div>
        <Card/>
      </div>

    </div>
    
  )
}

export default teste