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
} from "../chromium.test-utils";

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

const DADOS: AulaNoPlayer = {
  amostra: null,
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

const YOUTUBE_FALSO = `
  window.yt = [];
  window.YT = {
    Player: function (alvo, opcoes) {
      const iframe = document.createElement("iframe");
      iframe.id = "iframe-do-youtube";
      iframe.srcdoc = '<button>Play video</button><button>Copy link</button><a href="#">Watch on YouTube</a>';
      alvo.replaceWith(iframe);
      window.ytEventos = opcoes.events;
      const anotar = (nome) => (...a) => { window.yt.push(a.length ? nome + ":" + a.join(",") : nome); };
      setTimeout(() => opcoes.events.onReady(), 0);
      return {
        destroy: anotar("destroy"),
        getCurrentTime: () => 0,
        getDuration: () => 634,
        getPlaybackRate: () => 1,
        loadModule: anotar("loadModule"),
        mute: anotar("mute"),
        pauseVideo: anotar("pauseVideo"),
        playVideo: anotar("playVideo"),
        seekTo: anotar("seekTo"),
        setPlaybackRate: anotar("setPlaybackRate"),
        setVolume: anotar("setVolume"),
        unloadModule: anotar("unloadModule"),
        unMute: anotar("unMute"),
      };
    },
  };
`;

async function empacotar(comYoutube = false) {
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
                assistida: window.conquistaNoTeste !== undefined,
                cobertura: { pct: 0, seg: 0 },
                conquista: window.conquistaNoTeste ?? null,
                recusadosSeg: 0,
                trechos: pedido.trechos,
              }),
            },
          },
        };
      `,
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
            !comYoutube && args.importer.endsWith("use-player-da-aula.ts")
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

  return await saida.text();
}

const navegacao = await import("next/navigation");

mock.module("next/navigation", () => ({
  ...navegacao,
  useRouter: () => ({ refresh: () => undefined }),
}));

const { PlayerDaAula } = await import("./player-da-aula");

const { default: CarregandoAula } =
  await import("../../app/(aluno)/cursos/[slug]/aulas/[aulaId]/loading");

const ESQUELETO = renderToStaticMarkup(<CarregandoAula />);
const { FimDoVideo } = await import("./fim-do-video");

const PAGINA =
  "grid items-start gap-6 min-[1081px]:grid-cols-[minmax(0,1fr)_360px]";

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const SEPARADOR_DE_CLASSES = /[\s"'`]+/;

const classesDe = (h: string) =>
  [...h.matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO));

const fontes = await Promise.all(
  [
    "partes.ts",
    "ajustes-do-player.tsx",
    "controles-do-player.tsx",
    "player-da-aula.tsx",
    "status-do-player.tsx",
  ].map((f) => file(join(import.meta.dir, f)).text())
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
  ...classesDe(ESQUELETO),
  ...PAGINA.split(" "),
  ...fontes.join(" ").split(SEPARADOR_DE_CLASSES),
]);

let enviar: Enviar;
let pacote: string;
let pacoteComYoutube: string;

const CASCA_DO_COMPUTADOR =
  '<div style="flex:none;width:68px"></div><main style="flex:1;min-width:0;margin:10px 10px 10px 0;padding:32px clamp(1rem,4vw,3rem) 64px">';

const CASCA_DO_CELULAR =
  '<main style="flex:1;min-width:0;padding:24px 16px 64px">';

async function abrir(
  largura: number,
  altura: number,
  assistida = false,
  celular = false,
  codigo = pacote
) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: altura,
    mobile: celular,
    width: largura,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body style="margin:0"><div style="display:flex">${celular ? CASCA_DO_CELULAR : CASCA_DO_COMPUTADOR}<div class="${PAGINA}"><div id="raiz"></div><aside style="height:420px"></aside></div></main></div></body></html>`
    )}); document.close(); window.scrollTo(0, 0);`
  );
  await avaliar(
    enviar,
    `window.assistidaNoTeste = ${assistida}; window.conquistaNoTeste = undefined;`
  );
  await avaliar(enviar, codigo === pacoteComYoutube ? YOUTUBE_FALSO : "");
  await avaliar(enviar, codigo);
}

const COM_BARRA_DE_ROLAGEM =
  'document.documentElement.style.overflowY = "scroll"';

async function abrirEsqueleto(
  largura: number,
  altura: number,
  celular: boolean
) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: altura,
    mobile: celular,
    width: largura,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body style="margin:0"><div style="display:flex">${celular ? CASCA_DO_CELULAR : CASCA_DO_COMPUTADOR}${ESQUELETO}</main></div></body></html>`
    )}); document.close(); window.scrollTo(0, 0);`
  );
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

const TECLAS: Record<string, { code: string; vk: number }> = {
  ArrowLeft: { code: "ArrowLeft", vk: 37 },
  ArrowRight: { code: "ArrowRight", vk: 39 },
  Enter: { code: "Enter", vk: 13 },
  Escape: { code: "Escape", vk: 27 },
  Tab: { code: "Tab", vk: 9 },
};

async function apertar(key: string) {
  const { code, vk } = TECLAS[key] ?? { code: key, vk: 0 };
  const base = { code, key, windowsVirtualKeyCode: vk };
  await enviar("Input.dispatchKeyEvent", {
    ...base,
    text: key === "Enter" ? "\r" : undefined,
    type: "keyDown",
  });
  await enviar("Input.dispatchKeyEvent", { ...base, type: "keyUp" });
  await avaliar(
    enviar,
    "new Promise((r) => requestAnimationFrame(() => r(0)))"
  );
}

async function tabAte(
  rotulo: string,
  paradas: string[] = []
): Promise<string[]> {
  await apertar("Tab");

  const parada = await avaliar<string>(
    enviar,
    `(() => { const a = document.activeElement; return a.tagName + " " + (a.getAttribute("aria-label") ?? a.textContent.trim()); })()`
  );

  const ate = [...paradas, parada];

  return parada.includes(rotulo) || ate.length >= 10
    ? ate
    : await tabAte(rotulo, ate);
}

const apertarVezes = (key: string, vezes: number) =>
  Array.from({ length: vezes }).reduce<Promise<void>>(
    (anterior) => anterior.then(() => apertar(key)),
    Promise.resolve()
  );

const focado = () =>
  avaliar<string | null>(
    enviar,
    `document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent ?? null`
  );

const pressionado = (seletor: string) =>
  avaliar<string | null>(
    enviar,
    `document.querySelector(${JSON.stringify(seletor)})?.getAttribute("aria-pressed") ?? null`
  );

const FOLHA_DOS_AJUSTES = '[role="dialog"][aria-label="Ajustes"]';

const velocidadeMarcada = () =>
  avaliar<string | null>(
    enviar,
    `document.querySelector('${FOLHA_DOS_AJUSTES} input[type="radio"]:checked')?.getAttribute("aria-label") ?? null`
  );

const CONQUISTA_COM_BONUS = {
  bonusSequencia: 30,
  pontos: 10,
  sequenciaDias: 7,
};

function linhasDaBarra() {
  return avaliar<{ topos: Record<string, number>; transborda: boolean }>(
    enviar,
    `(() => {
      const player = document.getElementById("video");
      const topo = (el) => { const r = el.getBoundingClientRect(); return Math.round(r.top + r.height / 2); };
      const botao = (rotulo) => topo(player.querySelector('button[aria-label="' + rotulo + '"]'));
      const tempo = [...player.querySelectorAll("span")].find((s) => s.textContent.includes(" / "));
      const visto = [...player.querySelectorAll("[tabindex='0']")].find((s) => s.textContent.includes("visto"));
      const barra = tempo.closest("[data-barra]") ?? tempo.parentElement;
      return {
        topos: {
          ajustes: botao("Ajustes"),
          avancar: botao("Avançar 10 segundos"),
          legendas: botao("Legendas"),
          reproduzir: topo(player.querySelector('button[aria-label="Reproduzir"], button[aria-label="Pausar"]')),
          som: topo(player.querySelector('button[aria-label="Silenciar"], button[aria-label="Ativar som"]')),
          telaCheia: botao("Tela cheia"),
          tempo: topo(tempo),
          visto: topo(visto),
          voltar: botao("Voltar 10 segundos"),
        },
        transborda: barra.scrollWidth > barra.clientWidth || document.documentElement.scrollWidth > window.innerWidth,
      };
    })()`
  );
}

async function assistirAteOFim() {
  await avaliar(
    enviar,
    `window.conquistaNoTeste = ${JSON.stringify(CONQUISTA_COM_BONUS)};`
  );
  await emitir({ duracaoSeg: 634, tipo: "pronto" });
  await emitir({ tipo: "tocou" });
  await emitir({ tipo: "terminou" });
  await esperar(`document.body.textContent.includes("aula assistida")`);
}

const LISTA_DE_ATALHOS = '[role="dialog"]:not([aria-label="Ajustes"])';

describe.skipIf(!existsSync(CHROMIUM))("o player da aula no browser", () => {
  beforeAll(async () => {
    [enviar, pacote, pacoteComYoutube] = await Promise.all([
      abrirChromium("player-da-aula"),
      empacotar(),
      empacotar(true),
    ]);
  }, 20_000);

  afterAll(fecharChromium);

  test("pelo Tab, do topo da aula se chega ao slider de posição sem passar pelo iframe do YouTube, que segue clicável", async () => {
    await abrir(1440, 900, false, false, pacoteComYoutube);
    await esperar(
      `document.querySelector("#iframe-do-youtube")?.contentDocument?.querySelector("button")`
    );
    expect(await tabAte("Posição no vídeo")).toEqual(["DIV Posição no vídeo"]);
    expect(
      await avaliar<boolean>(
        enviar,
        `(() => { const f = document.getElementById("iframe-do-youtube"); const r = f.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === f && getComputedStyle(f).pointerEvents !== "none"; })()`
      )
    ).toBe(true);
  });

  for (const [largura, altura] of [
    [1440, 900],
    [1896, 915],
  ] as const) {
    test(`em ${largura} x ${altura}, a barra de controles e a Próxima aula cabem na janela sem rolar`, async () => {
      await abrir(largura, altura);

      const medida = await avaliar<{
        controles: number;
        navegacao: number;
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
            navegacao: Math.ceil(document.querySelector('nav[aria-label="Navegação entre aulas"]').getBoundingClientRect().bottom),
            rolou: window.scrollY,
            // A moldura de 10 px fica parada por cima do pé da janela.
            visivel: window.innerHeight - 10,
            video: { altura: Math.round(video.height), largura: Math.round(video.width) },
          };
        })()`
      );

      expect(medida.rolou).toBe(0);
      expect(medida.controles).toBeLessThanOrEqual(medida.visivel);
      expect(medida.navegacao).toBeLessThanOrEqual(medida.visivel);
      expect(
        Math.abs(medida.video.largura / medida.video.altura - 16 / 9)
      ).toBeLessThan(0.01);
    });
  }

  for (const [largura, altura] of [
    [1280, 800],
    [1440, 900],
  ] as const) {
    test(`em ${largura} x ${altura}, a barra não quebra quando a aula fica assistida com o bônus`, async () => {
      await abrir(largura, altura);
      await assistirAteOFim();
      const { topos, transborda } = await linhasDaBarra();
      expect(transborda).toBe(false);
      const linha = topos.reproduzir;

      for (const [peca, topo] of Object.entries(topos)) {
        expect({ peca, umaLinha: Math.abs(topo - linha) <= 1 }).toEqual({
          peca,
          umaLinha: true,
        });
      }
    });
  }

  for (const largura of [375, 390]) {
    test(`em ${largura} px, a barra tem duas linhas pensadas: os botões em cima, o tempo e o "% visto" embaixo`, async () => {
      await abrir(largura, 812, false, true);
      await assistirAteOFim();
      const { topos, transborda } = await linhasDaBarra();
      expect(transborda).toBe(false);
      const { tempo, visto, ...botoes } = topos;
      const emCima = topos.reproduzir;

      for (const [peca, topo] of Object.entries(botoes)) {
        expect({ emCima: Math.abs(topo - emCima) <= 1, peca }).toEqual({
          emCima: true,
          peca,
        });
      }

      expect(tempo).toBeGreaterThan(emCima);
      expect(Math.abs(visto - tempo)).toBeLessThanOrEqual(1);
    });
  }

  test("em 320 px, os seis botões ficam em cima e o som desce para a linha do tempo", async () => {
    await abrir(320, 640, false, true);
    await assistirAteOFim();
    const { topos, transborda } = await linhasDaBarra();
    expect(transborda).toBe(false);
    const { som, tempo, visto, ...botoes } = topos;
    const emCima = topos.reproduzir;

    for (const [peca, topo] of Object.entries(botoes)) {
      expect({ emCima: Math.abs(topo - emCima) <= 1, peca }).toEqual({
        emCima: true,
        peca,
      });
    }

    expect(tempo).toBeGreaterThan(emCima);
    expect(Math.abs(som - tempo)).toBeLessThanOrEqual(1);
    expect(Math.abs(visto - tempo)).toBeLessThanOrEqual(1);
  });

  test("enquanto o vídeo carrega, o player fica ocupado e os botões desligados pulsam", async () => {
    await abrir(1440, 900);

    const sinal = () =>
      avaliar<{ ocupado: string | null; pulso: string[] }>(
        enviar,
        `({
          ocupado: document.getElementById("video").getAttribute("aria-busy"),
          pulso: ["Reproduzir", "Voltar 10 segundos", "Avançar 10 segundos"].map((r) => {
            const b = document.querySelector('button[aria-label="' + r + '"]');
            return (b.disabled ? "desligado " : "ligado ") + getComputedStyle(b.parentElement).animationName;
          }),
        })`
      );

    expect(await sinal()).toEqual({
      ocupado: "true",
      pulso: ["desligado pulse", "desligado pulse", "desligado pulse"],
    });
    await emitir({ duracaoSeg: 634, tipo: "pronto" });
    expect(await sinal()).toEqual({
      ocupado: "false",
      pulso: ["ligado none", "ligado none", "ligado none"],
    });
  });

  for (const [largura, altura, celular] of [
    [1440, 900, false],
    [1120, 800, false],
    [1180, 800, false],
    [1000, 800, false],
    [390, 812, true],
    [320, 640, true],
  ] as const) {
    test(`em ${largura} x ${altura}, o esqueleto do player tem o topo e a altura do player com os controles`, async () => {
      await abrirEsqueleto(largura, altura, celular);
      await avaliar(enviar, COM_BARRA_DE_ROLAGEM);

      const esqueleto = await avaliar<{ altura: number; topo: number }>(
        enviar,
        `(() => { const r = document.querySelector('[aria-busy] [data-slot="skeleton"]:has(> div)').getBoundingClientRect(); return { altura: Math.round(r.height), topo: Math.round(r.top) }; })()`
      );

      await abrir(largura, altura, false, celular);
      await emitir({ duracaoSeg: 634, tipo: "pronto" });
      await avaliar(enviar, COM_BARRA_DE_ROLAGEM);

      const player = await avaliar<{ altura: number; topo: number }>(
        enviar,
        `(() => { const r = document.getElementById("video").getBoundingClientRect(); return { altura: Math.round(r.height), topo: Math.round(r.top) }; })()`
      );

      expect({ altura: esqueleto.altura, largura }).toEqual({
        altura: player.altura,
        largura,
      });

      if (largura > 320) {
        expect({ largura, topo: esqueleto.topo }).toEqual({
          largura,
          topo: player.topo,
        });
      }
    });
  }

  test("os Ajustes trocam a velocidade, ligam a legenda e abrem a lista de atalhos, que fecha no Esc", async () => {
    await abrir(1440, 900);
    await emitir({ duracaoSeg: 634, tipo: "pronto" });
    expect(await pedidos()).toContain("legenda:false");

    await clicar('button[aria-label="Ajustes"]');
    await esperar(`document.querySelector('${FOLHA_DOS_AJUSTES}')`);
    expect(
      await avaliar<boolean>(
        enviar,
        `document.getElementById("video").contains(document.querySelector('${FOLHA_DOS_AJUSTES}'))`
      )
    ).toBe(true);
    expect(
      await avaliar<string[]>(
        enviar,
        `[...document.querySelectorAll('${FOLHA_DOS_AJUSTES} fieldset label')].map((l) => l.textContent + (l.querySelector("input").checked ? "*" : ""))`
      )
    ).toEqual(["0,75", "1*", "1,25", "1,5", "1,75", "2"]);

    await clicar(`${FOLHA_DOS_AJUSTES} input[aria-label="1,5×"]`);
    expect(await pedidos()).toEqual(["velocidade:1.5"]);
    expect(await velocidadeMarcada()).toBe("1,5×");

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

  test("pelo teclado, o Esc fecha os Ajustes e devolve o foco à engrenagem, mesmo depois de escolher a velocidade", async () => {
    await abrir(1440, 900);
    await emitir({ duracaoSeg: 634, tipo: "pronto" });
    await avaliar(
      enviar,
      `document.querySelector('button[aria-label="Ajustes"]').focus()`
    );
    await apertar("Enter");
    await esperar(`document.querySelector('${FOLHA_DOS_AJUSTES}')`);
    await apertarVezes("ArrowRight", 4);
    expect(await focado()).toBe("2×");
    expect(await velocidadeMarcada()).toBe("2×");
    await apertar("Escape");
    expect(await focado()).toBe("Ajustes");
    await esperar(`!document.querySelector('${FOLHA_DOS_AJUSTES}')`);
    expect(await focado()).toBe("Ajustes");
  });

  test("pelo teclado, o foco entra na velocidade marcada e as setas andam entre as velocidades", async () => {
    await abrir(1440, 900);
    await emitir({ duracaoSeg: 634, tipo: "pronto" });
    await avaliar(
      enviar,
      `document.querySelector('button[aria-label="Ajustes"]').focus()`
    );
    await apertar("Enter");
    await esperar(`document.querySelector('${FOLHA_DOS_AJUSTES}')`);
    expect(await focado()).toBe("1×");
    await pedidos();
    await apertar("ArrowRight");
    expect(await focado()).toBe("1,25×");
    expect(await velocidadeMarcada()).toBe("1,25×");
    await apertarVezes("ArrowLeft", 2);
    expect(await focado()).toBe("0,75×");
    expect(await velocidadeMarcada()).toBe("0,75×");
    expect(await pedidos()).toEqual([
      "velocidade:1.25",
      "velocidade:1",
      "velocidade:0.75",
    ]);
    await apertar("Tab");
    expect(await focado()).toBe("LegendasDesligadas");
  });

  test("pelo teclado, as teclas dentro dos Ajustes ficam na folha e não tocam nem andam no vídeo", async () => {
    await abrir(1440, 900);
    await emitir({ duracaoSeg: 634, tipo: "pronto" });
    await avaliar(
      enviar,
      `document.querySelector('button[aria-label="Ajustes"]').focus()`
    );
    await apertar("Enter");
    await esperar(`document.querySelector('${FOLHA_DOS_AJUSTES}')`);
    await apertar("Tab");
    expect(await focado()).toBe("LegendasDesligadas");
    await pedidos();
    await ["ArrowRight", "ArrowLeft", "l", "k"].reduce<Promise<void>>(
      (anterior, tecla) => anterior.then(() => apertar(tecla)),
      Promise.resolve()
    );
    expect(await pedidos()).toEqual([]);
  });

  test("com o YouTube, andar no vídeo antes do primeiro play não o faz tocar: a posição espera o Reproduzir", async () => {
    await abrir(1440, 900, false, false, pacoteComYoutube);
    await esperar(
      `document.querySelector('button[aria-label="Reproduzir"]')?.disabled === false`
    );
    const chamadas = () => avaliar<string[]>(enviar, "window.yt.splice(0)");
    await chamadas();
    await avaliar(
      enviar,
      `document.querySelector('button[aria-label="Reproduzir"]').focus()`
    );
    await apertar("ArrowRight");
    await clicar('button[aria-label="Avançar 10 segundos"]');
    expect(await chamadas()).toEqual([]);
    expect(
      await avaliar<string>(
        enviar,
        `[...document.querySelectorAll("#video span")].find((s) => s.textContent.includes(" / ")).textContent`
      )
    ).toStartWith("00:15 / 10:34");
    await clicar('button[aria-label="Reproduzir"]');
    expect(await chamadas()).toEqual(["seekTo:15,true", "playVideo"]);
    await avaliar(enviar, "window.ytEventos.onStateChange({ data: 1 })");
    await chamadas();
    await clicar('button[aria-label="Avançar 10 segundos"]');
    expect(await chamadas()).toEqual(["seekTo:10,true"]);
  });

  test("pelo teclado, o Esc na lista de atalhos devolve o foco à engrenagem", async () => {
    await abrir(1440, 900);
    await emitir({ duracaoSeg: 634, tipo: "pronto" });
    await avaliar(
      enviar,
      `document.querySelector('button[aria-label="Ajustes"]').focus()`
    );
    await apertar("Enter");
    await esperar(`document.querySelector('${FOLHA_DOS_AJUSTES}')`);
    await apertarVezes("Tab", 2);
    expect(await focado()).toBe("Atalhos do teclado?");
    await apertar("Enter");
    await esperar(`document.querySelector('${LISTA_DE_ATALHOS}')`);
    await apertar("Escape");
    expect(await focado()).toBe("Ajustes");
    await esperar(`!document.querySelector('${LISTA_DE_ATALHOS}')`);
    expect(await focado()).toBe("Ajustes");
  });

  test("pelo teclado, o item focado dos Ajustes clareia sobre a folha, e a velocidade marcada acende como o botão amarelo", async () => {
    await abrir(1440, 900);
    await emitir({ duracaoSeg: 634, tipo: "pronto" });
    await avaliar(
      enviar,
      `document.querySelector('button[aria-label="Ajustes"]').focus()`
    );
    await apertar("Enter");
    await esperar(`document.querySelector('${FOLHA_DOS_AJUSTES}')`);

    const sinal = () =>
      avaliar<{
        cor: string;
        folha: string;
        fundo: string;
        item: string;
        sombra: string;
      }>(
        enviar,
        `new Promise((pronto) => setTimeout(() => {
          const item = document.activeElement;
          // O rádio da velocidade fica escondido: quem acende é o rótulo dele.
          const estilo = getComputedStyle(item.type === "radio" ? item.closest("label") : item);
          pronto({
            cor: estilo.color,
            folha: getComputedStyle(document.querySelector('${FOLHA_DOS_AJUSTES}')).backgroundColor,
            fundo: estilo.backgroundColor,
            item: item.getAttribute("aria-label") ?? item.textContent,
            sombra: estilo.boxShadow,
          });
        }, 250))`
      );

    const TRILHO = "rgb(77, 82, 87)";
    const TITULO = "rgb(244, 245, 247)";
    const POPOVER = "rgb(58, 63, 69)";

    const marcada = await sinal();
    expect(marcada).toMatchObject({
      folha: POPOVER,
      fundo: "rgb(255, 214, 51)",
      item: "1×",
    });
    expect(marcada.sombra).toContain("rgba(255, 204, 1, 0.28)");
    await apertar("Tab");
    expect(await sinal()).toMatchObject({
      cor: TITULO,
      fundo: TRILHO,
      item: "LegendasDesligadas",
    });
  });

  test("a linha entre a velocidade e os itens dos Ajustes vai de uma borda à outra da folha", async () => {
    await abrir(1440, 900);
    await emitir({ duracaoSeg: 634, tipo: "pronto" });
    await clicar('button[aria-label="Ajustes"]');
    await esperar(`document.querySelector('${FOLHA_DOS_AJUSTES}')`);

    const medida = await avaliar<{ folha: number[]; linha: number[] }>(
      enviar,
      `new Promise((pronto) => setTimeout(() => {
        const folha = document.querySelector('${FOLHA_DOS_AJUSTES}');
        const f = folha.getBoundingClientRect();
        const l = folha.querySelector("hr").getBoundingClientRect();
        pronto({
          folha: [Math.round(f.left + folha.clientLeft), Math.round(f.left + folha.clientLeft + folha.clientWidth)],
          linha: [Math.round(l.left), Math.round(l.right)],
        });
      }, 250))`
    );

    expect(medida.linha).toEqual(medida.folha);
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
    await esperar(
      `[...document.querySelectorAll("a")].filter((a) => a.textContent.trim() === "Próxima aula" && getComputedStyle(a).backgroundColor === "rgb(255, 204, 1)").length === 1`
    );
  });

  test("a dica de um controle nasce dentro do player, que é o que a tela cheia mostra", async () => {
    await abrir(1440, 900);
    await emitir({ duracaoSeg: 634, tipo: "pronto" });

    const { x, y } = await avaliar<{ x: number; y: number }>(
      enviar,
      `(() => { const r = document.querySelector('[aria-label="Voltar 10 segundos"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`
    );

    await enviar("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await esperar(
      `[...document.querySelectorAll("[data-side]")].some((d) => d.textContent.includes("Voltar 10 s"))`
    );
    expect(
      await avaliar<boolean>(
        enviar,
        `[...document.querySelectorAll("[data-side]")].find((d) => d.textContent.includes("Voltar 10 s")).closest("#video") !== null`
      )
    ).toBe(true);
  });
});
