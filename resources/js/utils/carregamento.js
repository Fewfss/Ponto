let requisicoes = 0;
const ouvintes = new Set();

const avisar = () => ouvintes.forEach((fn) => fn(requisicoes));

export const totalRequisicoes = () => requisicoes;

export function inscrever(fn) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
}

function ehChamadaDaApi(entrada) {
    try {
        const url = new URL(String(entrada?.url ?? entrada), window.location.origin);
        return url.origin === window.location.origin && url.pathname.startsWith("/api");
    } catch {
        return false;
    }
}

let instalado = false;

export function instalarCarregamentoAutomatico() {
    if (instalado || typeof window === "undefined") return;
    instalado = true;

    const fetchOriginal = window.fetch.bind(window);

    window.fetch = async (entrada, opcoes = {}) => {
        const monitorar = !opcoes.semCarregamento && ehChamadaDaApi(entrada);

        if (monitorar) {
            requisicoes += 1;
            avisar();
        }

        try {
            return await fetchOriginal(entrada, opcoes);
        } finally {
            if (monitorar) {
                requisicoes -= 1;
                avisar();
            }
        }
    };
}