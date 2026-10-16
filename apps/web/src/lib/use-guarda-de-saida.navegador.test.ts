import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { type Server, serve } from "bun";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  type Enviar,
  fecharChromium,
} from "../components/chromium-de-teste";
import { guardarLinks } from "./use-guarda-de-saida";

const PAGINA = `<!doctype html><html><body>
  <a id="catalogo" href="/admin/catalogo">Catálogo</a>
  <a id="ancora" href="#modulos">Módulos</a>
  <a id="fora" href="https://example.com/" target="_blank">Fora</a>
  <button id="botao" type="button">Nada</button>
</body></html>`;

interface Clique {
  avisos: string[];
  chegou: boolean;
}

let enviar: Enviar;
let servidor: Server<undefined> | null = null;

/** A página precisa de uma origem de verdade: num about:blank o link relativo não resolve. */
const servir = () => {
  servidor = serve({
    fetch: () =>
      new Response(PAGINA, {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    port: 0,
  });
  return `http://127.0.0.1:${servidor.port}/admin/catalogo/cursos/x`;
};

async function esperarAPagina(tentativas = 50): Promise<void> {
  const pronta = await avaliar<boolean>(
    enviar,
    'document.getElementById("catalogo") !== null'
  ).catch(() => false);
  if (pronta) {
    return;
  }
  if (tentativas === 0) {
    throw new Error("a página da guarda não carregou");
  }
  await new Promise((r) => setTimeout(r, 100));
  return esperarAPagina(tentativas - 1);
}

function clicar(
  id: string,
  resposta: boolean,
  opcoes: { ctrl?: boolean; desligar?: boolean } = {}
): Promise<Clique> {
  return avaliar<Clique>(
    enviar,
    `(() => {
      const avisos = [];
      let chegou = false;
      const segurar = (e) => { chegou = true; e.preventDefault(); };
      window.addEventListener("click", segurar);
      const soltar = (${guardarLinks.toString()})(document, (aviso) => { avisos.push(aviso); return ${resposta}; });
      if (${opcoes.desligar === true}) soltar();
      const evento = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ctrlKey: ${opcoes.ctrl === true} });
      document.getElementById(${JSON.stringify(id)}).dispatchEvent(evento);
      window.removeEventListener("click", segurar);
      soltar();
      return { avisos, chegou };
    })()`
  );
}

describe.skipIf(!existsSync(CHROMIUM))("guarda de saída por link", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("guarda-de-saida");
    await enviar("Page.navigate", { url: servir() });
    await esperarAPagina();
  }, 20_000);

  afterAll(async () => {
    await fecharChromium();
    servidor?.stop(true);
  });

  test("o link do app pergunta, e o não para o clique antes de navegar", async () => {
    expect(await clicar("catalogo", false)).toEqual({
      avisos: [
        "Você tem mudanças que não foram salvas. Sair mesmo assim e perdê-las?",
      ],
      chegou: false,
    });
  });

  test("o sim deixa o clique seguir até a navegação", async () => {
    expect(await clicar("catalogo", true)).toMatchObject({
      chegou: true,
    });
  });

  test("âncora da própria página, link em outra aba, Ctrl+clique e botão não perguntam", async () => {
    expect([
      await clicar("ancora", false),
      await clicar("fora", false),
      await clicar("catalogo", false, { ctrl: true }),
      await clicar("botao", false),
    ]).toEqual([
      { avisos: [], chegou: true },
      { avisos: [], chegou: true },
      { avisos: [], chegou: true },
      { avisos: [], chegou: true },
    ]);
  });

  test("a guarda desligada não pergunta mais", async () => {
    expect(await clicar("catalogo", false, { desligar: true })).toEqual({
      avisos: [],
      chegou: true,
    });
  });
});
