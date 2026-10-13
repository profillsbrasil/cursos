import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FONTE = readFileSync(join(import.meta.dir, "../../public/sw.js"), "utf8");

type Ouvinte = (evento: unknown) => void;

function carregarServiceWorker() {
  const ouvintes = new Map<string, Ouvinte>();
  const pedidosDoServiceWorker: unknown[] = [];
  const paginaOffline = new Response("offline");
  const self = {
    addEventListener: (tipo: string, ouvinte: Ouvinte) =>
      ouvintes.set(tipo, ouvinte),
    registration: { navigationPreload: { enable: async () => undefined } },
  };
  const caches = { match: async () => paginaOffline };
  const fetch = (pedido: unknown) => {
    pedidosDoServiceWorker.push(pedido);
    return Promise.reject(new TypeError("sem rede"));
  };
  new Function("self", "caches", "fetch", FONTE)(self, caches, fetch);

  async function navegar(preloadResponse: Promise<Response>) {
    let resposta: Promise<Response> | undefined;
    ouvintes.get("fetch")?.({
      preloadResponse,
      request: { method: "GET", mode: "navigate" },
      respondWith: (r: Promise<Response>) => {
        resposta = r;
      },
    });
    return await resposta;
  }

  return { navegar, pedidosDoServiceWorker };
}

/**
 * O pedido que o service worker refaz com fetch() sai com Sec-Fetch-Dest:
 * empty, e o Clerk só faz o handshake para "document": o login vira loop.
 */
describe("service worker na navegação", () => {
  test("entrega a página do preload do browser, sem refazer o pedido", async () => {
    const sw = carregarServiceWorker();
    const resposta = await sw.navegar(
      Promise.resolve(new Response("pagina do servidor"))
    );
    expect(await resposta?.text()).toBe("pagina do servidor");
    expect(sw.pedidosDoServiceWorker).toEqual([]);
  });

  test("sem rede, mostra a página offline", async () => {
    const sw = carregarServiceWorker();
    const semRede = Promise.reject(new TypeError("sem rede"));
    semRede.catch(() => undefined);
    const resposta = await sw.navegar(semRede);
    expect(await resposta?.text()).toBe("offline");
  });
});
