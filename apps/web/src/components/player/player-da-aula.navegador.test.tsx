// O player da aula no Chromium headless, com o CSS real do app e o componente
// empacotado pelo Bun.build. O YouTube vira um player falso que guarda o que a
// sessão pediu e emite os eventos que o teste manda, e a casca é desenhada com as
// medidas dela: a sidebar recolhida de 68 px, a moldura de 10 px e o padding do
// conteúdo. Sem Chromium na máquina, tudo pula.

import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import type { AulaId, VideoDaAula } from "@cursos/api/dominio/tipos";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";
import { build, file } from "bun";
import { renderToStaticMarkup } from "react-dom/server";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";

const ENTRADA = join(import.meta.dir, "player.entrada.tsx");
const VIDEO_FALSO = join(import.meta.dir, "video-falso.js");
const TRPC = join(import.meta.dir, "trpc-falso.js");
const NAVEGACAO = join(import.meta.dir, "navegacao-falsa.js");
const LINK = join(import.meta.dir, "link-sem-roteador.js");
const VIDEO_DO_HOOK = /^\.\/video$/;
const UTILS_TRPC = /^@\/utils\/trpc$/;
const NEXT_NAVIGATION = /^next\/navigation$/;
const NEXT_LINK = /^next\/link$/;

const ATUAL = "00000000-0000-4000-8000-000000000004" as AulaId;
const PROXIMA = "00000000-0000-4000-8000-000000000005" as AulaId;
const VIDEO = { id: "aqz-KE-bpKQ", provedor: "youtube" } as VideoDaAula;

/** Uma aula real de 10:34, com título de uma linha e descrição de duas. */
const DADOS: AulaNoPlayer = {
  anterior: null,
  aula: {
    descricao:
      "Como montar o cronograma a partir da data que o cliente precisa da máquina rodando, e o que entra em cada etapa: pedido, fabricação, frete e instalação na fábrica.",
    duracaoSeg: 634,
    id: ATUAL,
    modulo: { numero: 8, titulo: "Pilar Urgência" },
    numeroNoModulo: 4,
    titulo: "Cronograma reverso",
    totalNoModulo: 8,
    video: VIDEO,
  },
  curso: {
    progresso: { feitas: 46, pct: 51, total: 90 },
    slug: "comercial",
    titulo: "Profills School Comercial",
  },
  estudo: { assistida: false, posicaoSeg: 0, trechos: SEM_TRECHOS },
  modulos: [],
  proxima: { id: PROXIMA, titulo: "Prazo que o cliente aceita" },
  questionario: null,
};

async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: `
        import { flushSync } from "react-dom";
        import { createRoot } from "react-dom/client";
        import { PlayerDaAula } from "./player-da-aula";

        const dados = ${JSON.stringify(DADOS)};
        dados.estudo.assistida = window.assistidaNoTeste === true;
        const raiz = createRoot(document.getElementById("raiz"));
        flushSync(() =>
          raiz.render(
            <PlayerDaAula dados={dados} inicioSeg={0} video={${JSON.stringify(VIDEO)}} />
          )
        );
      `,
      // O player falso cria um iframe de verdade, como o YouTube, para o teste ver
      // que o fim do vídeo o esconde sem destruir.
      [VIDEO_FALSO]: `
        window.pedidos = [];
        export function criarPlayerDeVideo(_video, elemento, opcoes) {
          const iframe = document.createElement("iframe");
          iframe.id = "iframe-falso";
          elemento.replaceChildren(iframe);
          let tempo = opcoes.inicioSeg;
          const pedir = (nome, valor) => window.pedidos.push(valor === undefined ? nome : nome + ":" + valor);
          window.emitir = opcoes.aoEvento;
          return {
            buscar: (seg) => { tempo = seg; pedir("buscar", seg); },
            definirLegenda: (ligada) => pedir("legenda", ligada),
            definirMudo: (mudo) => pedir("mudo", mudo),
            definirVelocidade: (v) => pedir("velocidade", v),
            definirVolume: (n) => pedir("volume", n),
            destruir: () => pedir("destruir"),
            pausar: () => pedir("pausar"),
            tempo: () => tempo,
            tocar: () => pedir("tocar"),
            velocidade: () => 1,
          };
        }
      `,
      [TRPC]: `
        export const trpcClient = {
          aula: {
            registrar: {
              mutate: async (pedido) => ({
                assistida: false,
                cobertura: { pct: 0, seg: 0 },
                conquista: null,
                recusadosSeg: 0,
                trechos: pedido.trechos,
              }),
            },
          },
        };
      `,
      // O roteador do App Router é o mesmo objeto a cada render, e o efeito da sessão depende dele.
      [NAVEGACAO]: `
        const roteador = { refresh: () => undefined };
        export const useRouter = () => roteador;
      `,
      [LINK]: `import { createElement } from "react";
        export default function Link(props) { return createElement("a", props); }`,
    },
    format: "iife",
    plugins: [
      {
        name: "player-falso",
        setup(construtor) {
          construtor.onResolve({ filter: VIDEO_DO_HOOK }, (args) =>
            args.importer.endsWith("use-player-da-aula.ts")
              ? { path: VIDEO_FALSO }
              : undefined
          );
          construtor.onResolve({ filter: UTILS_TRPC }, () => ({ path: TRPC }));
          construtor.onResolve({ filter: NEXT_NAVIGATION }, () => ({
            path: NAVEGACAO,
          }));
          construtor.onResolve({ filter: NEXT_LINK }, () => ({ path: LINK }));
        },
      },
    ],
    target: "browser",
  });
  const [saida] = pacote.outputs;
  if (!(pacote.success && saida)) {
    throw new Error(`o pacote do player não saiu: ${pacote.logs.join("\n")}`);
  }
  return saida.text();
}

const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  useRouter: () => ({ refresh: () => undefined }),
}));
const { PlayerDaAula } = await import("./player-da-aula");
const { FimDoVideo } = await import("./fim-do-video");

// A página da aula, como o page.tsx a monta, com a coluna do curso no lugar.
const PAGINA =
  "grid items-start gap-6 min-[1081px]:grid-cols-[minmax(0,1fr)_360px]";
const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const SEPARADOR_DE_CLASSES = /[\s"'`]+/;
const classesDe = (h: string) =>
  [...h.matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO));
// As folhas dos ajustes e dos atalhos e o vídeo escondido no fim só existem depois
// do clique ou do evento: as classes deles vêm do código-fonte, lido como texto, como
// o Tailwind do app faz.
const fontes = await Promise.all(
  ["partes.ts", "ajustes-do-player.tsx", "player-da-aula.tsx"].map((f) =>
    file(join(import.meta.dir, f)).text()
  )
);
const nada = () => undefined;
const css = await cssDoApp([
  ...classesDe(
    renderToStaticMarkup(
      <PlayerDaAula dados={DADOS} inicioSeg={0} video={VIDEO} />
    )
  ),
  ...classesDe(
    renderToStaticMarkup(
      <FimDoVideo aoRever={nada} assistida conquista={null} dados={DADOS} />
    )
  ),
  ...PAGINA.split(" "),
  ...fontes.join(" ").split(SEPARADOR_DE_CLASSES),
]);

let enviar: Enviar;
let pacote: string;

async function abrir(largura: number, altura: number, assistida = false) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: altura,
    mobile: false,
    width: largura,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body style="margin:0"><div style="display:flex"><div style="flex:none;width:68px"></div><main style="flex:1;min-width:0;margin:10px 10px 10px 0;padding:32px clamp(1rem,4vw,3rem) 64px"><div class="${PAGINA}"><div id="raiz"></div><aside style="height:420px"></aside></div></main></div></body></html>`
    )}); document.close(); window.scrollTo(0, 0);`
  );
  await avaliar(enviar, `window.assistidaNoTeste = ${assistida};`);
  await avaliar(enviar, pacote);
}

function esperar(condicao: string) {
  return avaliar(
    enviar,
    `new Promise((pronto, falhou) => {
      const inicio = performance.now();
      const olhar = () => {
        if (${condicao}) return pronto(true);
        if (performance.now() - inicio > 2000) return falhou(new Error("não aconteceu: " + ${JSON.stringify(condicao)}));
        setTimeout(olhar, 20);
      };
      olhar();
    })`
  );
}

const clicar = (seletor: string) =>
  avaliar(enviar, `document.querySelector(${JSON.stringify(seletor)}).click()`);
const clicarNoTexto = (texto: string) =>
  avaliar(
    enviar,
    `[...document.querySelectorAll("button, a")].find((b) => b.textContent.trim() === ${JSON.stringify(texto)}).click()`
  );
const pedidos = () => avaliar<string[]>(enviar, "window.pedidos.splice(0)");
const emitir = (evento: Record<string, unknown>) =>
  avaliar(enviar, `window.emitir(${JSON.stringify(evento)})`);
const teclar = (key: string) =>
  avaliar(
    enviar,
    `document.getElementById("video").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: ${JSON.stringify(key)} }))`
  );
const pressionado = (seletor: string) =>
  avaliar<string | null>(
    enviar,
    `document.querySelector(${JSON.stringify(seletor)})?.getAttribute("aria-pressed") ?? null`
  );
const FOLHA_DOS_AJUSTES = '[role="dialog"][aria-label="Ajustes"]';
const LISTA_DE_ATALHOS = '[role="dialog"]:not([aria-label="Ajustes"])';

describe.skipIf(!existsSync(CHROMIUM))("o player da aula no browser", () => {
  beforeAll(async () => {
    [enviar, pacote] = await Promise.all([
      abrirChromium("player-da-aula"),
      empacotar(),
    ]);
  }, 20_000);

  afterAll(fecharChromium);

  for (const [largura, altura] of [
    [1440, 900],
    [1896, 915],
  ] as const) {
    test(`em ${largura} x ${altura}, a barra de controles inteira cabe na janela sem rolar`, async () => {
      await abrir(largura, altura);
      const medida = await avaliar<{
        controles: number;
        rolou: number;
        visivel: number;
        video: { altura: number; largura: number };
      }>(
        enviar,
        `(() => {
          const player = document.getElementById("video");
          const video = player.firstElementChild.firstElementChild.getBoundingClientRect();
          return {
            controles: Math.ceil(player.lastElementChild.getBoundingClientRect().bottom),
            rolou: window.scrollY,
            // A moldura de 10 px fica parada por cima do pé da janela.
            visivel: window.innerHeight - 10,
            video: { altura: Math.round(video.height), largura: Math.round(video.width) },
          };
        })()`
      );
      expect(medida.rolou).toBe(0);
      expect(medida.controles).toBeLessThanOrEqual(medida.visivel);
      // O vídeo continua 16:9, só menor.
      expect(
        Math.abs(medida.video.largura / medida.video.altura - 16 / 9)
      ).toBeLessThan(0.01);
    });
  }

  test("os Ajustes trocam a velocidade, ligam a legenda e abrem a lista de atalhos, que fecha no Esc", async () => {
    await abrir(1440, 900);
    await emitir({ duracaoSeg: 634, tipo: "pronto" });
    expect(await pedidos()).toContain("legenda:false");

    await clicar('button[aria-label="Ajustes"]');
    await esperar(`document.querySelector('${FOLHA_DOS_AJUSTES}')`);
    // A folha nasce dentro do player, que é o que aparece em tela cheia.
    expect(
      await avaliar<boolean>(
        enviar,
        `document.getElementById("video").contains(document.querySelector('${FOLHA_DOS_AJUSTES}'))`
      )
    ).toBe(true);
    expect(
      await avaliar<string[]>(
        enviar,
        `[...document.querySelectorAll('${FOLHA_DOS_AJUSTES} fieldset button')].map((b) => b.textContent + (b.getAttribute("aria-pressed") === "true" ? "*" : ""))`
      )
    ).toEqual(["0,75", "1*", "1,25", "1,5", "1,75", "2"]);

    await clicar(`${FOLHA_DOS_AJUSTES} button[aria-label="1,5×"]`);
    expect(await pedidos()).toEqual(["velocidade:1.5"]);
    expect(await pressionado('button[aria-label="1,5×"]')).toBe("true");

    await clicarNoTexto("LegendasDesligadas");
    expect(await pedidos()).toEqual(["legenda:true"]);
    expect(await pressionado('button[aria-label="Legendas"]')).toBe("true");

    await clicarNoTexto("Atalhos do teclado?");
    await esperar(
      `document.querySelector('${LISTA_DE_ATALHOS}') && !document.querySelector('${FOLHA_DOS_AJUSTES}')`
    );
    const lista = await avaliar<string>(
      enviar,
      `document.querySelector('${LISTA_DE_ATALHOS}').textContent`
    );
    expect(lista).toContain("Atalhos do teclado");
    expect(lista).toContain("Liga e desliga a legenda");

    await avaliar(
      enviar,
      `document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }))`
    );
    await esperar(`!document.querySelector('${LISTA_DE_ATALHOS}')`);
  });

  test("a tecla ? abre a lista de atalhos e a tecla c alterna a legenda", async () => {
    await abrir(1440, 900);
    await emitir({ duracaoSeg: 634, tipo: "pronto" });
    await pedidos();
    await teclar("c");
    expect(await pedidos()).toEqual(["legenda:true"]);
    await teclar("?");
    await esperar(`document.querySelector('${LISTA_DE_ATALHOS}')`);
  });

  test("no fim, o cartão toma o lugar do vídeo com o iframe escondido, e Rever do início busca 0 e toca", async () => {
    await abrir(1440, 900);
    await emitir({ duracaoSeg: 634, tipo: "pronto" });
    await emitir({ tipo: "tocou" });
    await emitir({ tipo: "terminou" });
    await esperar(`document.body.textContent.includes("Fim do vídeo")`);
    const fim = await avaliar<{
      iframeNoLugar: boolean;
      iframeVisivel: boolean;
      sobreposto: boolean;
    }>(
      enviar,
      `(() => {
        const iframe = document.getElementById("iframe-falso");
        const cartao = [...document.querySelectorAll("h2")].find((h) => h.textContent === "Fim do vídeo");
        return {
          iframeNoLugar: iframe !== null && document.getElementById("video").contains(iframe),
          iframeVisivel: iframe.getClientRects().length > 0,
          sobreposto: getComputedStyle(cartao.closest(".grid.min-h-full")).position !== "static",
        };
      })()`
    );
    expect(fim).toEqual({
      iframeNoLugar: true,
      iframeVisivel: false,
      sobreposto: false,
    });
    await pedidos();
    await clicarNoTexto("Rever do início");
    expect(await pedidos()).toEqual(["buscar:0", "tocar"]);
    await emitir({ tipo: "tocou" });
    await esperar(`!document.body.textContent.includes("Fim do vídeo")`);
    expect(
      await avaliar<boolean>(
        enviar,
        `document.getElementById("iframe-falso").getClientRects().length > 0`
      )
    ).toBe(true);
  });

  test("no fim da aula assistida, só o cartão leva a Próxima aula em Sol", async () => {
    await abrir(1440, 900, true);
    await emitir({ duracaoSeg: 634, tipo: "pronto" });
    await emitir({ tipo: "terminou" });
    await esperar(`document.body.textContent.includes("Aula assistida")`);
    // O botão de baixo estava em Sol antes do fim, e a cor dele sai numa transição.
    await esperar(
      `[...document.querySelectorAll("a")].filter((a) => a.textContent.trim() === "Próxima aula" && getComputedStyle(a).backgroundColor === "rgb(255, 204, 1)").length === 1`
    );
  });
});
