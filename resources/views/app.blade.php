<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600&display=swap" rel="stylesheet">

    <style>
        #carregamento-inicial {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100vh;
            height: 100dvh;
            z-index: 3000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            box-sizing: border-box;
            background: rgba(70, 70, 70, 0.55);
            -webkit-backdrop-filter: blur(6px);
            backdrop-filter: blur(6px);
            color: #ffffff;
            font-family: 'Poppins', sans-serif;
            /* só aparece depois de 250ms, para não piscar quando o site carrega rápido */
            animation: ci-fade-in 0.25s ease 250ms both;
        }
        #carregamento-inicial.ci-saindo {
            pointer-events: none;
            animation: ci-fade-out 0.3s ease forwards;
        }
        .ci-sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            margin: -1px;
            padding: 0;
            overflow: hidden;
            clip-path: inset(50%);
            white-space: nowrap;
            border: 0;
        }
        .ci-pontos {
            display: flex;
            align-items: baseline;
            justify-content: center;
            gap: 0.25em;
            max-width: 100%;
            font-family: 'Poppins', sans-serif;
            font-size: clamp(1.75rem, 6.5vw, 4rem);
            font-weight: 800;
            line-height: 1;
            white-space: nowrap;
            user-select: none;
        }
        .ci-espaco {
            display: inline-flex;
            justify-content: center;
        }
        .ci-glifo {
            display: inline-block;
            min-width: 0.3em;
            text-align: center;
            font-family: 'Poppins', sans-serif;
            font-weight: 800;
            font-style: normal;
            color: #ffffff;
            opacity: 0;
            transform-origin: 50% 100%;
        }
        .ci-glifo.ci-visivel { opacity: 1; }
        .ci-glifo.ci-entrar { animation: ci-entrar 0.82s linear both; }
        .ci-glifo.ci-pular { animation: ci-pular 0.85s linear both; }

        @@keyframes ci-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @@keyframes ci-fade-out { to { opacity: 0; } }
        @@keyframes ci-entrar {
            0%   { opacity: 0; transform: translateY(-0.9em) scale(0.75, 1.3); animation-timing-function: ease-in; }
            29%  { opacity: 1; transform: translateY(0) scale(1, 1); animation-timing-function: ease-out; }
            39%  { opacity: 1; transform: translateY(0) scale(1.4, 0.6); animation-timing-function: ease-out; }
            56%  { opacity: 1; transform: translateY(-0.28em) scale(0.88, 1.18); animation-timing-function: ease-in; }
            72%  { opacity: 1; transform: translateY(0) scale(1.1, 0.9); animation-timing-function: ease-out; }
            84%  { opacity: 1; transform: translateY(-0.06em) scale(0.97, 1.03); animation-timing-function: ease-in; }
            100% { opacity: 1; transform: translateY(0) scale(1, 1); }
        }
        @@keyframes ci-pular {
            0%   { transform: translateY(0) scale(1, 1); animation-timing-function: ease-out; }
            9%   { transform: translateY(0) scale(1.25, 0.75); animation-timing-function: ease-out; }
            33%  { transform: translateY(-0.65em) scale(0.85, 1.2); animation-timing-function: ease-in; }
            57%  { transform: translateY(0) scale(1, 1); animation-timing-function: ease-out; }
            65%  { transform: translateY(0) scale(1.4, 0.6); animation-timing-function: ease-out; }
            80%  { transform: translateY(-0.08em) scale(0.95, 1.05); animation-timing-function: ease-in; }
            100% { transform: translateY(0) scale(1, 1); }
        }

        @@media (prefers-reduced-motion: reduce) {
            #carregamento-inicial { animation-duration: 0.01ms; }
            .ci-glifo.ci-entrar, .ci-glifo.ci-pular { animation: none; }
        }
    </style>
    <noscript><style>#carregamento-inicial { display: none; }</style></noscript>

    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
    @inertiaHead
</head>
<body>
    <!-- Animação de carregamento inicial -->
    <div id="carregamento-inicial" role="status" aria-live="polite">
        <span class="ci-sr-only">Carregando…</span>
        <div class="ci-pontos" aria-hidden="true">
            <span class="ci-espaco"><span class="ci-glifo"></span></span>
            <span class="ci-espaco"><span class="ci-glifo"></span></span>
            <span class="ci-espaco"><span class="ci-glifo"></span></span>
        </div>
    </div>

    <script>
        (function () {
            var raiz = document.getElementById('carregamento-inicial');
            if (!raiz) return;

            var glifos = Array.prototype.slice.call(raiz.querySelectorAll('.ci-glifo'));
            var fases = ['.', '!', 'ponto', '?'];
            var inicio = Date.now();
            var vivo = true;

            function esperar(ms) {
                return new Promise(function (resolver) { setTimeout(resolver, ms); });
            }

            function animar(glifo, classe) {
                glifo.classList.remove('ci-entrar', 'ci-pular');
                void glifo.offsetWidth;
                glifo.classList.add(classe);
            }

            function trocar(glifo, texto) {
                animar(glifo, 'ci-pular');
                setTimeout(function () { glifo.textContent = texto; }, 280); // no ponto mais alto do pulo
            }

            async function ciclo() {
                while (vivo) {
                    glifos.forEach(function (g) { g.className = 'ci-glifo'; g.textContent = fases[0]; });
                    for (var i = 0; i < glifos.length && vivo; i++) {
                        glifos[i].classList.add('ci-visivel');
                        animar(glifos[i], 'ci-entrar');
                        await esperar(200);
                    }
                    await esperar(1100);

                    for (var f = 1; f < fases.length && vivo; f++) {
                        for (var j = 0; j < glifos.length && vivo; j++) {
                            trocar(glifos[j], fases[f]);
                            await esperar(200);
                        }
                        await esperar(1100);
                    }

                    await esperar(300);
                    glifos.forEach(function (g) { g.classList.remove('ci-visivel'); });
                    await esperar(350);
                }
            }

            window.removerCarregamentoInicial = function () {
                if (!vivo) return;
                vivo = false;
                if (Date.now() - inicio < 250) {
                    raiz.remove(); // carregou rápido: a animação nem chegou a aparecer
                    return;
                }
                raiz.classList.add('ci-saindo');
                setTimeout(function () { raiz.remove(); }, 350);
            };
            setTimeout(function () { window.removerCarregamentoInicial(); }, 15000);

            ciclo();
        })();
    </script>

    @inertia

    <!-- Widget de acessibilidade UserWay -->
    <script>
        (function(d) {
            var s = d.createElement("script");
            s.setAttribute("data-account", "dEcXIkLEZp");
            s.setAttribute("data-position", "3");
            s.setAttribute("src", "https://cdn.userway.org/widget.js");
            (d.body || d.head).appendChild(s);
        })(document);
    </script>
</body>
</html>