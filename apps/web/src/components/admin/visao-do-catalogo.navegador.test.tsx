import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build, sleep } from "bun";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";

const AQUI = import.meta.dir;
const ENTRADA = join(AQUI, "catalogo.entrada.tsx");
const LINK = join(AQUI, "link-falso.jsx");
const IMAGEM = join(AQUI, "imagem-falsa.jsx");
const SUBSTITUTOS: [RegExp, string][] = [
  [/^next\/link$/, LINK],
  [/^next\/image$/, IMAGEM],
];

const capaDe = (nome: string) => ({
  alt: "",
  altura: 604,
  largura: 900,
  url: `data:image/jpeg;base64,${readFileSync(join(AQUI, `../../../public/capas/${nome}.jpg`)).toString("base64")}`,
});

const h = (horas: number, min: number) => horas * 3600 + min * 60;

// Os 10 cursos do protótipo aprovado, com o destaque longo que alargava o item.
const CURSOS = [
  ["Atendimento pós-venda", "pos-venda", 4, 18, h(2, 40), 300, null, null],
  [
    "Autoavaliação Comercial",
    "autoavaliacao",
    1,
    3,
    h(0, 15),
    null,
    null,
    "30 afirmações · 6 competências",
  ],
  ["Boas práticas de fabricação", "bpf", 3, 12, h(1, 35), 200, null, null],
  ["Fábrica e montagem", "seguranca", 3, 7, h(1, 12), null, null, null],
  [
    "Fundamentos do envase de líquidos",
    "fundamentos",
    6,
    28,
    h(4, 12),
    800,
    null,
    null,
  ],
  [
    "Gravação de Máquinas",
    "gravacao",
    1,
    4,
    h(0, 22),
    null,
    null,
    "Regra 5x4",
    "em_producao",
  ],
  [
    "Limpeza CIP e troca de formato",
    "limpeza",
    2,
    0,
    0,
    1000,
    null,
    null,
    "em_producao",
  ],
  [
    "Nova Rotina de Fechamento",
    "nova-rotina",
    2,
    9,
    h(0, 58),
    null,
    "POP-COM-001",
    null,
  ],
  [
    "Portfólio: envasadoras, embaladoras e enfardadeiras",
    "portfolio",
    5,
    22,
    h(3, 5),
    500,
    null,
    null,
  ],
  [
    "Profills School Comercial",
    "comercial",
    16,
    90,
    h(15, 51),
    null,
    null,
    null,
  ],
].map(
  ([
    titulo,
    imagem,
    modulos,
    aulas,
    segundosDeVideo,
    precoTroca,
    codigo,
    destaque,
    status,
  ]) => ({
    aulas,
    capa: capaDe(imagem as string),
    categoria: "Vendas e negócios",
    codigo,
    destaque,
    id: imagem,
    modulos,
    precoTroca,
    segundosDeVideo,
    status: status ?? "publicado",
    titulo,
  })
);

const PAGINA = `
  import { useState } from "react";
  import { flushSync } from "react-dom";
  import { createRoot } from "react-dom/client";
  import { VisaoDoCatalogo } from "./visao-do-catalogo";

  const CURSOS = ${JSON.stringify(CURSOS)};

  function Pagina() {
    const [n, setN] = useState(CURSOS.length);
    window.mostrar = (quantos) => flushSync(() => setN(quantos));
    return <VisaoDoCatalogo key={n} visao={{ cursos: CURSOS.slice(0, n) }} />;
  }
  const raiz = createRoot(document.getElementById("raiz"));
  flushSync(() => raiz.render(<Pagina />));
`;

async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: PAGINA,
      [LINK]: `
        export default function Link({ href, ...resto }) {
          return <a href={href} {...resto} />;
        }
      `,
      [IMAGEM]: `
        export default function Image({ fill, sizes, ...resto }) {
          return <img {...resto} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
        }
      `,
    },
    format: "iife",
    plugins: [
      {
        name: "next-falso",
        setup(construtor) {
          for (const [filtro, caminho] of SUBSTITUTOS) {
            construtor.onResolve({ filter: filtro }, () => ({ path: caminho }));
          }
        },
      },
    ],
    target: "browser",
  });
  const [saida] = pacote.outputs;
  if (!(pacote.success && saida)) {
    throw new Error(`o pacote da tela não saiu: ${pacote.logs.join("\n")}`);
  }
  return saida.text();
}

const ARQUIVOS_COM_CLASSES = [
  "visao-do-catalogo.tsx",
  "filtro-do-catalogo.tsx",
  "grade-do-catalogo.ts",
  "acompanhamento.tsx",
  "partes.tsx",
  "../casca/botoes.ts",
  "../casca/campos.ts",
  "../../../../../packages/ui/src/components/input.tsx",
  "../../../../../packages/ui/src/components/button.tsx",
  "../../../../../packages/ui/src/components/badge.tsx",
].map((f) => join(AQUI, f));
const PALAVRA = /[\s"'`{}]+/;
const css = await cssDoApp(
  ARQUIVOS_COM_CLASSES.flatMap((f) => readFileSync(f, "utf8").split(PALAVRA))
);

const FOTOS = process.env.FOTOS_DO_CATALOGO;
const FONTES = join(AQUI, "../certificado/fontes");
const fonte = FOTOS
  ? ["Regular", "Medium", "SemiBold", "Bold"]
      .map(
        (peso, i) =>
          `@font-face{font-family:Geist;font-weight:${400 + i * 100};src:url(data:font/ttf;base64,${readFileSync(join(FONTES, `Geist-${peso}.ttf`)).toString("base64")}) format("truetype")}`
      )
      .join("")
  : "";

let enviar: Enviar;
let pacote: string;

async function abrirTela(largura: number) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 900,
    mobile: largura < 768,
    width: largura,
  });
  const conteudo =
    largura < 768
      ? "padding:24px 16px 64px"
      : "margin-left:15.5rem;padding:32px 48px 64px";
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR" style="--font-geist-sans:Geist"><head><meta name="viewport" content="width=device-width"><style>${fonte}${css}</style></head><body class="bg-background font-sans text-foreground" style="margin:0"><main style="${conteudo}"><div id="raiz"></div></main></body></html>`
    )}); document.close();`
  );
  await avaliar(enviar, pacote);
}

const DEPOIS_DAS_TRANSICOES_MS = 300;
async function foto(nome: string) {
  if (!FOTOS) {
    return;
  }
  await sleep(DEPOIS_DAS_TRANSICOES_MS);
  const { data } = (await enviar("Page.captureScreenshot", {
    captureBeyondViewport: true,
    format: "png",
  })) as { data: string };
  writeFileSync(join(FOTOS, `${nome}.png`), Buffer.from(data, "base64"));
}

const titulos = () =>
  avaliar<string[]>(
    enviar,
    `[...document.querySelectorAll("article h2")].map((t) => t.textContent)`
  );
const clicarNoFiltro = (rotulo: string) =>
  avaliar(
    enviar,
    `[...document.querySelectorAll("button[aria-pressed]")].find((b) => b.firstChild.textContent === ${JSON.stringify(rotulo)}).click()`
  );
async function buscar(termo: string) {
  await avaliar(
    enviar,
    `(() => { const i = document.querySelector('input[type="search"]'); i.focus(); i.select(); })()`
  );
  await enviar("Input.insertText", { text: termo });
}

interface Caixa {
  direita: number;
  esquerda: number;
  largura: number;
  topo: number;
}
const caixas = () =>
  avaliar<Caixa[]>(
    enviar,
    `[...document.querySelectorAll("article, ${ATALHO}")].map((el) => {
      const r = el.getBoundingClientRect();
      return { direita: Math.round(r.right), esquerda: Math.round(r.left), largura: Math.round(r.width), topo: Math.round(r.top) };
    })`
  );

const CEU = "rgb(170, 210, 234)";
const ATALHO = "a[href$='/novo']:not(header a)";

/** Aperta Tab, como a pessoa, até o foco chegar ao seletor. */
async function tabAte(seletor: string, tentativas = 20): Promise<void> {
  const chegou = await avaliar<boolean>(
    enviar,
    `document.activeElement?.matches(${JSON.stringify(seletor)}) ?? false`
  );
  if (chegou || tentativas === 0) {
    return;
  }
  const tecla = { code: "Tab", key: "Tab", windowsVirtualKeyCode: 9 };
  await enviar("Input.dispatchKeyEvent", { ...tecla, type: "rawKeyDown" });
  await enviar("Input.dispatchKeyEvent", { ...tecla, type: "keyUp" });
  return tabAte(seletor, tentativas - 1);
}

describe.skipIf(!existsSync(CHROMIUM))("catálogo do admin no Chromium", () => {
  beforeAll(async () => {
    [enviar, pacote] = await Promise.all([
      abrirChromium("catalogo"),
      empacotar(),
    ]);
  }, 20_000);

  afterAll(fecharChromium);

  test("1280 px: colunas iguais de 250 px ou mais, 20 px entre elas, e o destaque longo não alarga o item", async () => {
    await abrirTela(1280);
    await foto("1280");
    const itens = await caixas();
    expect(itens).toHaveLength(CURSOS.length + 1);
    const primeiraLinha = itens.filter((c) => c.topo === itens[0]?.topo);
    expect(primeiraLinha.length).toBeGreaterThanOrEqual(3);
    for (const item of itens) {
      expect(item.largura).toBe(itens[0]?.largura ?? 0);
      expect(item.largura).toBeGreaterThanOrEqual(250);
    }
    for (const [a, b] of primeiraLinha
      .slice(1)
      .map((c, i) => [primeiraLinha[i], c])) {
      expect((b?.esquerda ?? 0) - (a?.direita ?? 0)).toBe(20);
    }
  });

  test("o foco no título acende o anel Céu da capa e cresce a imagem, e o atalho ganha a borda Céu", async () => {
    await abrirTela(1280);
    await enviar("Emulation.setFocusEmulationEnabled", { enabled: true });
    await tabAte("article h2 a");
    await sleep(DEPOIS_DAS_TRANSICOES_MS);
    const capa = await avaliar<{ anel: string; escala: string }>(
      enviar,
      `(() => {
        const capa = document.querySelector("article > div");
        return { anel: getComputedStyle(capa).boxShadow, escala: getComputedStyle(capa.querySelector("img")).scale };
      })()`
    );
    expect(capa.anel).toContain(CEU);
    expect(capa.escala).toBe("1.03");
    await tabAte(ATALHO);
    await sleep(DEPOIS_DAS_TRANSICOES_MS);
    await foto("1280-foco-no-atalho");
    expect(
      await avaliar<string>(
        enviar,
        `getComputedStyle(document.querySelector(${JSON.stringify(ATALHO)})).borderTopColor`
      )
    ).toBe(CEU);
  });

  test("os filtros de status e a busca pelo título escolhem os cursos da grade", async () => {
    await abrirTela(1280);
    await clicarNoFiltro("Em produção");
    expect(await titulos()).toEqual([
      "Gravação de Máquinas",
      "Limpeza CIP e troca de formato",
    ]);
    await clicarNoFiltro("Todos");
    await buscar("fabrica");
    expect(await titulos()).toEqual([
      "Boas práticas de fabricação",
      "Fábrica e montagem",
    ]);
    await buscar("zzz");
    expect(await titulos()).toEqual([]);
    expect(
      await avaliar<string>(
        enviar,
        `document.querySelector('[role="status"]').textContent`
      )
    ).toBe("Nenhum curso com esse filtro.");
    await foto("1280-sem-resultado");
  });

  test("390 px: uma coluna na largura do conteúdo", async () => {
    await abrirTela(390);
    await foto("390");
    const itens = await caixas();
    for (const item of itens) {
      expect(item.esquerda).toBe(16);
      expect(item.largura).toBe(390 - 32);
    }
  });

  test("vazio: o convite para criar, sem o botão do topo", async () => {
    await abrirTela(1280);
    await avaliar(enviar, "window.mostrar(0)");
    await foto("1280-vazio");
    expect(
      await avaliar<number>(
        enviar,
        `document.querySelectorAll("a[href$='/novo']").length`
      )
    ).toBe(1);
  });
});
