// A Casca de verdade, montada no Chromium headless com o CSS do app: a gaveta do
// celular, o topo do celular, o cartão de conta e o Continuar com a sidebar
// recolhida. O Clerk, o roteador, o next/link e o next/image viram peças falsas no
// pacote; o resto é o código do app. Sem Chromium, a suíte pula.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { build, serve } from "bun";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";

const ENTRADA = join(import.meta.dir, "gaveta-e-conta.entrada.tsx");
const FALSOS = join(import.meta.dir, "falsos-da-casca.js");
const FALSO =
  /^(@clerk\/nextjs|next\/navigation|next\/headers|next\/link|next\/image)$/;

const AULA = "/cursos/comercial/aulas/a1";
const SEPARA_CLASSES = /[\s"'`\\]+/;

async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [FALSOS]: `
        import { createElement } from "react";
        export const useUser = () => ({ isLoaded: true, user: { fullName: "Ana Souza", hasImage: false } });
        export const useClerk = () => ({ signOut: () => undefined });
        export const usePathname = () => window.caminho;
        export const cookies = async () => ({ get: () => ({ value: String(window.aberta) }) });
        export default function Falso({ href, src, preload, ...resto }) {
          return src
            ? createElement("img", { ...resto, src })
            : createElement("a", { ...resto, href });
        }
      `,
      [ENTRADA]: `
        import { TooltipProvider } from "@cursos/ui/components/tooltip";
        import { createRoot } from "react-dom/client";
        import { flushSync } from "react-dom";
        import { CartaoContinuar } from "./../aluno/cartao-continuar";
        import { ITENS_DO_ALUNO } from "./../aluno/menu";
        import { Casca } from "./casca";

        const resolvida = (valor) =>
          Object.assign(Promise.resolve(valor), { status: "fulfilled", value: valor });

        window.montar = async ({ caminho, aberta, selo }) => {
          window.caminho = caminho;
          window.aberta = aberta;
          const arvore = await Casca({
            children: <div style={{ height: 4000 }}>conteúdo</div>,
            itens: ITENS_DO_ALUNO,
            outraArea: null,
            placar: resolvida({ saldo: 610, sequenciaDias: 0 }),
            rodape: (
              <CartaoContinuar
                cartao={resolvida({
                  chamada: "Continuar · faltam 7 min",
                  chamadaAqui: "Assistindo agora",
                  curso: "Comercial",
                  href: "${AULA}",
                  pct: 40,
                  rotulo: "Continuar: Gatilhos, Comercial, 40% do curso",
                  tipo: "continuar",
                  titulo: "Gatilhos",
                })}
              />
            ),
            rotulo: "Navegação principal",
            selo,
          });
          document.body.innerHTML = '<div id="raiz"></div>';
          window.scrollTo(0, 0);
          flushSync(() =>
            createRoot(document.getElementById("raiz")).render(
              <TooltipProvider>{arvore}</TooltipProvider>
            )
          );
        };
      `,
    },
    format: "iife",
    plugins: [
      {
        name: "casca-sem-next",
        setup(construtor) {
          construtor.onResolve({ filter: FALSO }, () => ({ path: FALSOS }));
        },
      },
    ],
    target: "browser",
  });
  const [saida] = pacote.outputs;
  if (!(pacote.success && saida)) {
    throw new Error(`o pacote da casca não saiu: ${pacote.logs.join("\n")}`);
  }
  return `window.process ??= { env: {} }; ${await saida.text()}`;
}

let enviar: Enviar;
let pacote: string;
let css: string;
const servidor = serve({
  fetch: () =>
    new Response("<!doctype html><title>casca</title>", {
      headers: { "content-type": "text/html" },
    }),
  port: 0,
});

const esperar = (ms: number) =>
  avaliar(enviar, `new Promise((r) => setTimeout(r, ${ms}))`);

async function montar(
  largura: number,
  props: { aberta: boolean; caminho: string; selo?: string }
) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 844,
    mobile: false,
    width: largura,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0"></body></html>`
    )}); document.close();`
  );
  await avaliar(enviar, pacote);
  await avaliar(enviar, `window.montar(${JSON.stringify(props)})`);
  await esperar(100);
}

const CODIGOS: Record<string, number> = { Enter: 13, Escape: 27, Tab: 9 };
async function tecla(key: string) {
  const comum = { code: key, key, windowsVirtualKeyCode: CODIGOS[key] };
  await enviar("Input.dispatchKeyEvent", {
    ...comum,
    text: key === "Enter" ? "\r" : undefined,
    type: "keyDown",
  });
  await enviar("Input.dispatchKeyEvent", { ...comum, type: "keyUp" });
  await esperar(400);
}

const gavetaAberta = () =>
  avaliar<boolean>(enviar, `!!document.querySelector('[data-mobile="true"]')`);

const retangulo = (seletor: string) =>
  avaliar<{ altura: number; esquerda: number; largura: number; topo: number }>(
    enviar,
    `(() => {
      const r = document.querySelector(${JSON.stringify(seletor)}).getBoundingClientRect();
      return { altura: r.height, esquerda: r.left, largura: r.width, topo: r.top };
    })()`
  );

describe.skipIf(!existsSync(CHROMIUM))("a casca no Chromium", () => {
  beforeAll(async () => {
    [enviar, pacote] = await Promise.all([
      abrirChromium("gaveta-e-conta"),
      empacotar(),
    ]);
    css = await cssDoApp(pacote.split(SEPARA_CLASSES));
    await enviar("Page.enable");
    await enviar("Page.navigate", { url: servidor.url.href });
    await avaliar(
      enviar,
      `new Promise((r) => document.readyState === "complete" ? r() : addEventListener("load", () => r()))`
    );
  }, 30_000);

  afterAll(async () => {
    await fecharChromium();
    servidor.stop(true);
  });

  test("na gaveta, um Esc com o foco num item fecha a gaveta", async () => {
    await montar(390, { aberta: true, caminho: "/meus-cursos" });
    await avaliar(
      enviar,
      `document.querySelector('[aria-label="Abrir navegação"]').focus()`
    );
    await tecla("Enter");
    expect(await gavetaAberta()).toBe(true);
    await tecla("Tab");
    expect(
      await avaliar<string>(enviar, "document.activeElement.textContent")
    ).toBe("Meus cursos");
    await tecla("Escape");
    expect(await gavetaAberta()).toBe(false);
  });

  test("o Fechar da gaveta tem os 40 px do Abrir", async () => {
    await montar(390, { aberta: true, caminho: "/meus-cursos" });
    await avaliar(
      enviar,
      `document.querySelector('[aria-label="Abrir navegação"]').click()`
    );
    await esperar(400);
    const abrir = await retangulo('[aria-label="Abrir navegação"]');
    const fechar = await retangulo('[aria-label="Fechar navegação"]');
    expect([fechar.largura, fechar.altura]).toEqual([
      abrir.largura,
      abrir.altura,
    ]);
    expect(fechar.largura).toBe(40);
  });

  test("no celular, o topo fica preso em cima e mostra o selo da área", async () => {
    await montar(390, { aberta: true, caminho: "/admin", selo: "Admin" });
    await avaliar(enviar, "window.scrollTo(0, 2000)");
    await esperar(50);
    const topo = await retangulo('[data-slot="topo-do-celular"]');
    expect(topo.topo).toBe(0);
    expect(
      await avaliar<string>(
        enviar,
        `document.querySelector('[data-slot="topo-do-celular"]').textContent`
      )
    ).toBe("Admin");
  });

  test("as divisórias do menu da conta vão de uma borda à outra", async () => {
    await montar(1280, { aberta: true, caminho: "/meus-cursos" });
    await avaliar(
      enviar,
      `document.querySelector('[data-slot="sidebar-footer"] [data-slot="dropdown-menu-trigger"]').click()`
    );
    await esperar(300);
    const menu = await retangulo('[data-slot="dropdown-menu-content"]');
    const divisorias = await avaliar<{ esquerda: number; largura: number }[]>(
      enviar,
      `[...document.querySelectorAll('[data-slot="dropdown-menu-separator"]')].map((d) => {
        const r = d.getBoundingClientRect();
        return { esquerda: r.left, largura: r.width };
      })`
    );
    expect(divisorias).toHaveLength(2);
    for (const d of divisorias) {
      expect(d).toEqual({ esquerda: menu.esquerda, largura: menu.largura });
    }
  });

  test("recolhida, o foco no cartão de conta acende o anel e abre a dica", async () => {
    await montar(1280, { aberta: false, caminho: "/meus-cursos" });
    const sombra = () =>
      avaliar<string>(
        enviar,
        `getComputedStyle(document.querySelector('[data-slot="sidebar-footer"] [data-slot="dropdown-menu-trigger"]')).boxShadow`
      );
    const repouso = await sombra();
    await avaliar(
      enviar,
      `document.querySelector('[aria-label^="Continuar"]').focus()`
    );
    await tecla("Tab");
    await esperar(200);
    expect(await sombra()).not.toBe(repouso);
    expect(
      await avaliar<string[]>(
        enviar,
        `[...document.querySelectorAll('[data-slot="tooltip-content"]')].map((d) => d.textContent)`
      )
    ).toEqual(["Ana Souza610 pts"]);
  });

  test("aberta, o cartão de conta não monta dica", async () => {
    await montar(1280, { aberta: true, caminho: "/meus-cursos" });
    await avaliar(
      enviar,
      `document.querySelector('[aria-label^="Continuar"]').focus()`
    );
    await tecla("Tab");
    expect(
      await avaliar<number>(
        enviar,
        `document.querySelectorAll('[data-slot="tooltip-content"]').length`
      )
    ).toBe(0);
  });

  test("recolhida na própria aula, o Continuar não é um círculo Sol cheio", async () => {
    const fundo = (seletor: string) =>
      avaliar<string>(
        enviar,
        `getComputedStyle(document.querySelector(${JSON.stringify(seletor)})).backgroundColor`
      );
    await montar(1280, { aberta: false, caminho: "/meus-cursos" });
    const comLink = await fundo('[aria-label^="Continuar"]');
    await montar(1280, { aberta: false, caminho: AULA });
    const aqui = await fundo(
      '[data-slot="sidebar-footer"] [aria-current="page"]'
    );
    expect(aqui).not.toBe(comLink);
  });
});
