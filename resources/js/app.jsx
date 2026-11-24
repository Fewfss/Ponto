import './bootstrap';
import '../js/components/styles/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import CarregandoNavegacao from './components/items/CarregandoNavegacao.jsx';   
import { instalarCarregamentoAutomatico } from './utils/carregamento.js';

instalarCarregamentoAutomatico();

createInertiaApp({
    title: (title) => (title ? `${title} — ponto` : 'ponto'),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.jsx`,
            import.meta.glob('./pages/**/*.jsx')
        ),
    setup({ el, App, props }) {
        createRoot(el).render(
    <>
        <App {...props} />
        <CarregandoNavegacao />
    </>
);
 requestAnimationFrame(() => window.removerCarregamentoInicial?.());
    },
});
