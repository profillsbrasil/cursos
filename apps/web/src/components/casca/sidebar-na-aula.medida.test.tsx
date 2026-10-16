import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Sidebar, SidebarInset } from "@cursos/ui/components/sidebar";
import { build, serve } from "bun";
import { renderToString } from "react-dom/server";

import { caminhoDaAula } from "@/lib/rotas";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";

let caminhoAtual = "/meus-cursos";
const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  usePathname: () => caminhoAtual,
}));
afterAll(() => {
  caminhoAtual = "/meus-cursos";
});

const { CabecalhoDaCasca } = await import("./cabecalho-da-casca");
const { ProvedorDaCasca } = await import("./provedor-da-casca");

const AULA_1 = caminhoDaAula("comercial", "a1");
const AULA_2 = caminhoDaAula("comercial", "a2");

function htmlDoServidor(caminho: string, cookieAberta: boolean) {
  caminhoAtual = caminho;
  return renderToString(
    <ProvedorDaCasca aberta={cookieAberta}>
      <Sidebar collapsible="icon" variant="sidebar">
        <CabecalhoDaCasca />
      </Sidebar>
      <SidebarInset>
        <div style={{ height: 3000 }}>conteúdo</div>
      </SidebarInset>
    </ProvedorDaCasca>
  );
}

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  [htmlDoServidor("/meus-cursos", true), htmlDoServidor(AULA_1, true)].flatMap(
    (html) =>
      [...html.matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO))
  )
);

const ENTRADA = join(import.meta.dir, "sidebar-na-aula.entrada.tsx");
const ROTEADOR = join(import.meta.dir, "roteador-falso.js");
const NEXT_NAVIGATION = /^next\/navigation$/;

async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ROTEADOR]: `
        import { useSyncExternalStore } from "react";
        const ouvintes = new Set();
        export function usePathname() {
          return useSyncExternalStore(
            (ouvir) => { ouvintes.add(ouvir); return () => ouvintes.delete(ouvir); },
            () => window.caminho,
            () => window.caminho
          );
        }
        export function irPara(caminho) {
          window.caminho = caminho;
          for (const ouvir of ouvintes) ouvir();
        }
      `,
      [ENTRADA]: `
        import { Sidebar, SidebarInset } from "@cursos/ui/components/sidebar";
        import { useEffect } from "react";
        import { flushSync } from "react-dom";
        import { hydrateRoot } from "react-dom/client";
        import { CabecalhoDaCasca } from "./cabecalho-da-casca";
        import { ProvedorDaCasca } from "./provedor-da-casca";
        import { irPara } from "./roteador-falso.js";

        function Hidratada({ aoHidratar, children }) {
          useEffect(aoHidratar, []);
          return children;
        }

        window.errosDoReact = [];
        const erro = console.error;
        console.error = (...partes) => {
          window.errosDoReact.push(partes.map(String).join(" "));
          erro(...partes);
        };

        window.casca = {
          hidratar: (caminho, cookieAberta) =>
            new Promise((pronto) => {
              window.caminho = caminho;
              hydrateRoot(
                document.getElementById("raiz"),
                <Hidratada aoHidratar={() => pronto()}>
                  <ProvedorDaCasca aberta={cookieAberta}>
                    <Sidebar collapsible="icon" variant="sidebar">
                      <CabecalhoDaCasca />
                    </Sidebar>
                    <SidebarInset>
                      <div style={{ height: 3000 }}>conteúdo</div>
                    </SidebarInset>
                  </ProvedorDaCasca>
                </Hidratada>
              );
            }),
          navegar: (caminho) => flushSync(() => irPara(caminho)),
        };
      `,
    },
    format: "iife",
    plugins: [
      {
        name: "next-sem-roteador",
        setup(construtor) {
          construtor.onResolve({ filter: NEXT_NAVIGATION }, () => ({
            path: ROTEADOR,
          }));
        },
      },
    ],
    target: "browser",
  });
  const [saida] = pacote.outputs;
  if (!(pacote.success && saida)) {
    throw new Error(`o pacote da casca não saiu: ${pacote.logs.join("\n")}`);
  }
  // O next/image lê a configuração do process.env, que o Next define no build.
  return `window.process ??= { env: {} }; ${await saida.text()}`;
}

let enviar: Enviar;
let pacote: string;
const servidor = serve({
  fetch: () =>
    new Response("<!doctype html><title>casca</title>", {
      headers: { "content-type": "text/html" },
    }),
  port: 0,
});

async function carregarHtmlDoServidor(caminho: string, cookieAberta: boolean) {
  await avaliar(
    enviar,
    `document.cookie = "sidebar_state=${cookieAberta}; path=/"; document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0"><div id="raiz">${htmlDoServidor(caminho, cookieAberta)}</div></body></html>`
    )}); document.close(); window.scrollTo(0, 0);`
  );
}

async function hidratar(caminho: string, cookieAberta: boolean) {
  await carregarHtmlDoServidor(caminho, cookieAberta);
  await avaliar(enviar, pacote);
  await avaliar(
    enviar,
    `window.casca.hidratar(${JSON.stringify(caminho)}, ${cookieAberta})`
  );
}

interface Medida {
  animando: boolean;
  cookie: string;
  largura: number;
  transicao: string;
}

const MEDIR = `(() => {
  const $ = (s) => document.querySelector('[data-slot="' + s + '"]');
  const container = $("sidebar-container");
  return {
    animando: $("sidebar-wrapper").hasAttribute("data-animando"),
    cookie: document.cookie,
    largura: container.getBoundingClientRect().width,
    transicao: getComputedStyle(container).transitionDuration,
  };
})()`;

const medir = () => avaliar<Medida>(enviar, MEDIR);
const navegar = (caminho: string) =>
  avaliar(enviar, `window.casca.navegar(${JSON.stringify(caminho)})`);
const clicar = (rotulo: string) =>
  avaliar(enviar, `document.querySelector('[aria-label="${rotulo}"]').click()`);
const esperarAnimacao = () =>
  avaliar(
    enviar,
    `new Promise((r) => {
      const ver = () =>
        document.querySelector('[data-slot="sidebar-wrapper"]').hasAttribute("data-animando")
          ? setTimeout(ver, 20)
          : r();
      ver();
    })`
  );
const proximoQuadro = () =>
  avaliar(enviar, "new Promise((r) => requestAnimationFrame(() => r()))");

const ABERTA = 248;
const RECOLHIDA = 68;

describe.skipIf(!existsSync(CHROMIUM))("a sidebar na aula, a 1280 px", () => {
  beforeAll(async () => {
    [enviar, pacote] = await Promise.all([
      abrirChromium("sidebar-na-aula"),
      empacotar(),
    ]);
    await enviar("Page.enable");
    await enviar("Page.navigate", { url: servidor.url.href });
    await avaliar(
      enviar,
      `new Promise((r) => document.readyState === "complete" ? r() : addEventListener("load", () => r()))`
    );
    await enviar("Emulation.setDeviceMetricsOverride", {
      deviceScaleFactor: 1,
      height: 800,
      mobile: false,
      width: 1280,
    });
  }, 30_000);

  afterAll(async () => {
    await fecharChromium();
    servidor.stop(true);
  });

  test("na carga direta da aula, chega recolhida antes do JS, com o cookie aberto", async () => {
    await carregarHtmlDoServidor(AULA_1, true);
    expect((await medir()).largura).toBe(RECOLHIDA);
    await avaliar(enviar, pacote);
    await avaliar(
      enviar,
      `window.casca.hidratar(${JSON.stringify(AULA_1)}, true)`
    );
    await proximoQuadro();
    expect(await medir()).toMatchObject({
      animando: false,
      cookie: "sidebar_state=true",
      largura: RECOLHIDA,
    });
    expect(await avaliar<string[]>(enviar, "window.errosDoReact")).toEqual([]);
  });

  test("entrar na aula pelo cliente recolhe com a animação do Recolher, e sair abre de novo", async () => {
    await hidratar("/meus-cursos", true);
    expect((await medir()).largura).toBe(ABERTA);

    await navegar(AULA_1);
    expect(await medir()).toMatchObject({ animando: true, transicao: "0.2s" });
    await proximoQuadro();
    await proximoQuadro();
    const noMeio = (await medir()).largura;
    expect(noMeio).toBeGreaterThan(RECOLHIDA);
    expect(noMeio).toBeLessThan(ABERTA);
    await esperarAnimacao();
    expect(await medir()).toMatchObject({
      animando: false,
      cookie: "sidebar_state=true",
      largura: RECOLHIDA,
    });

    await navegar("/meus-cursos");
    expect((await medir()).animando).toBe(true);
    await esperarAnimacao();
    expect(await medir()).toMatchObject({
      cookie: "sidebar_state=true",
      largura: ABERTA,
    });
  });

  test("aberta na aula, fica até a próxima aula, e o cookie recolhido não muda", async () => {
    await hidratar("/meus-cursos", false);
    await navegar(AULA_1);
    expect(await medir()).toMatchObject({
      animando: false,
      largura: RECOLHIDA,
    });

    await clicar("Abrir navegação");
    await esperarAnimacao();
    expect(await medir()).toMatchObject({
      cookie: "sidebar_state=false",
      largura: ABERTA,
    });

    await navegar(AULA_2);
    await esperarAnimacao();
    expect((await medir()).largura).toBe(RECOLHIDA);

    await avaliar(
      enviar,
      `dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "b" }))`
    );
    await proximoQuadro();
    expect(await medir()).toMatchObject({
      animando: false,
      cookie: "sidebar_state=false",
      largura: ABERTA,
    });

    await navegar("/trocar-pontos");
    await esperarAnimacao();
    expect(await medir()).toMatchObject({
      cookie: "sidebar_state=false",
      largura: RECOLHIDA,
    });
  });

  test("fora da aula, recolher continua gravando o cookie", async () => {
    await hidratar("/meus-cursos", true);
    await clicar("Recolher navegação");
    await esperarAnimacao();
    expect(await medir()).toMatchObject({
      cookie: "sidebar_state=false",
      largura: RECOLHIDA,
    });
  });

  test("com movimento reduzido, entrar na aula recolhe na hora", async () => {
    await enviar("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    try {
      await hidratar("/meus-cursos", true);
      await navegar(AULA_1);
      expect(await medir()).toMatchObject({
        animando: true,
        largura: RECOLHIDA,
        transicao: "0s",
      });
    } finally {
      await enviar("Emulation.setEmulatedMedia", { features: [] });
    }
  });
});
