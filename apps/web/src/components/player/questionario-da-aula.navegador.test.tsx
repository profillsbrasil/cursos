import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { build } from "bun";
import { renderToStaticMarkup } from "react-dom/server";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";
import {
  APROVADO_NA_PRIMEIRA,
  BLOQUEIO,
  CERTA_DO_CRONOGRAMA,
  CRONOGRAMA,
  REPROVADO_NA_PRIMEIRA,
} from "./exemplo-do-questionario";

const ENTRADA = join(import.meta.dir, "questionario.entrada.tsx");
const TRPC = join(import.meta.dir, "trpc-falso.js");
const NAVEGACAO = join(import.meta.dir, "navegacao-falsa.js");
const LINK = join(import.meta.dir, "link-sem-roteador.js");
const UTILS_TRPC = /^@\/utils\/trpc$/;
const NEXT_NAVIGATION = /^next\/navigation$/;
const NEXT_LINK = /^next\/link$/;

const [P1, P2, P3] = CRONOGRAMA.perguntas.map((p) => p.id);
const certaDe = (n: number) => CERTA_DO_CRONOGRAMA[n];

const RESULTADO = {
  acertos: 2,
  aprovada: false,
  paraPassar: 3,
  pontos: 10,
  pontosDaPrimeira: 10,
  respostas: [
    { alternativaId: certaDe(0), certa: true, certaId: null, perguntaId: P1 },
    {
      alternativaId: CRONOGRAMA.perguntas[1]?.alternativas[0]?.id,
      certa: false,
      certaId: null,
      perguntaId: P2,
    },
    { alternativaId: certaDe(2), certa: true, certaId: null, perguntaId: P3 },
  ],
  tentativa: 1,
  total: 3,
};

async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: `
        import { flushSync } from "react-dom";
        import { createRoot } from "react-dom/client";
        import { QuestionarioDaAula } from "./questionario-da-aula";
        import { CRONOGRAMA } from "./exemplo-do-questionario";

        // O about:blank do headless não é contexto seguro, e lá o crypto.randomUUID não existe.
        let gerados = 0;
        crypto.randomUUID ??= () => {
          gerados += 1;
          return "00000000-0000-4000-8000-1" + String(gerados).padStart(11, "0");
        };
        const raiz = createRoot(document.getElementById("raiz"));
        flushSync(() =>
          raiz.render(
            <QuestionarioDaAula
              aulaId="00000000-0000-4000-8000-00000000aaaa"
              proxima={{ id: "00000000-0000-4000-8000-00000000bbbb", titulo: "Próxima" }}
              questionario={CRONOGRAMA}
              slug="comercial"
              temVideo
            />
          )
        );
      `,
      [TRPC]: `
        import { TRPCClientError } from "@trpc/client";

        // O primeiro envio cai como erro de rede; os seguintes voltam o resultado.
        window.pedidos = [];
        export const trpcClient = {
          questionario: {
            responder: {
              mutate: async (entrada) => {
                window.pedidos.push(entrada);
                if (window.pedidos.length === 1) {
                  throw TRPCClientError.from(new TypeError("Failed to fetch"));
                }
                return { cursoConcluido: null, resultado: ${JSON.stringify(RESULTADO)} };
              },
            },
          },
        };
      `,
      [NAVEGACAO]: `
        export const useRouter = () => ({ refresh: () => undefined });
      `,
      // Fora do App Router o next/link não tem roteador: vira um <a>.
      [LINK]: `import { createElement } from "react";
        export default function Link(props) { return createElement("a", props); }`,
    },
    format: "iife",
    plugins: [
      {
        name: "servidor-falso",
        setup(construtor) {
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
    throw new Error(
      `o pacote do questionário não saiu: ${pacote.logs.join("\n")}`
    );
  }
  return saida.text();
}

const navegacao = await import("next/navigation");
const { mock } = await import("bun:test");
mock.module("next/navigation", () => ({
  ...navegacao,
  useRouter: () => ({ refresh: () => undefined }),
}));
const { QuestionarioDaAula } = await import("./questionario-da-aula");

const ESTADOS = [
  CRONOGRAMA,
  { ...BLOQUEIO, ultima: REPROVADO_NA_PRIMEIRA },
  { ...CRONOGRAMA, ultima: APROVADO_NA_PRIMEIRA },
];
const htmlDe = (q: (typeof ESTADOS)[number]) =>
  renderToStaticMarkup(
    <QuestionarioDaAula
      aulaId={"00000000-0000-4000-8000-00000000aaaa" as never}
      proxima={null}
      questionario={q}
      slug="comercial"
      temVideo
    />
  );
const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
// A alternativa marcada só existe depois do clique: as classes dela vêm à mão.
const css = await cssDoApp(
  ESTADOS.flatMap((q) =>
    [...htmlDe(q).matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO))
  ).concat([
    "text-destructive",
    "aria-disabled:opacity-50",
    "border-sol",
    "bg-sol/8",
    "bg-sol",
  ])
);

let enviar: Enviar;

async function abrir(largura: number, corpo: string, pacote?: string) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 900,
    mobile: false,
    width: largura,
  });
  const recuo = largura < 768 ? 16 : 48;
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body style="margin:0"><main style="padding:32px ${recuo}px"><div id="raiz">${corpo}</div></main></body></html>`
    )}); document.close(); window.scrollTo(0, 0);`
  );
  if (pacote) {
    await avaliar(enviar, pacote);
  }
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

const clicarNoBotao = (texto: string) =>
  avaliar(
    enviar,
    `[...document.querySelectorAll("button, a")].find((b) => b.textContent.trim() === ${JSON.stringify(texto)}).click()`
  );

const marcarAsCertas = () =>
  avaliar(
    enviar,
    `document.querySelectorAll("fieldset").forEach((g) => g.querySelectorAll('input[type="radio"]')[1].click())`
  );

const textoDe = (seletor: string) =>
  avaliar<string | null>(
    enviar,
    `document.querySelector(${JSON.stringify(seletor)})?.textContent.replace(/\\s+/g, " ").trim() ?? null`
  );

const marcados = () =>
  avaliar<number>(
    enviar,
    `document.querySelectorAll('input[type="radio"]:checked').length`
  );

interface Marcada {
  borda: string;
  fundo: string;
  letra: { cor: string; fundo: string };
  raio: string;
}

const OITO_POR_CENTO = / \/ 0\.08\)$/;

// Depois da transição de 150 ms das cores.
const marcada = () =>
  avaliar<Marcada>(
    enviar,
    `new Promise((r) => setTimeout(r, 250)).then(() => {
      const rotulo = document.querySelector('input[type="radio"]:checked').closest("label");
      const letra = getComputedStyle(rotulo.querySelector('[aria-hidden="true"]'));
      const caixa = getComputedStyle(rotulo);
      return {
        borda: caixa.borderTopColor,
        fundo: caixa.backgroundColor,
        letra: { cor: letra.color, fundo: letra.backgroundColor },
        raio: caixa.borderTopLeftRadius,
      };
    })`
  );

interface Caixa {
  esquerda: number;
  largura: number;
  topo: number;
}

interface Medida {
  acoes: Caixa[];
  alternativa: Caixa;
  larguraDaJanela: number;
  larguraDaPagina: number;
  larguraSemRolagem: number;
  pergunta: Caixa;
  pontos: Caixa;
  secao: Caixa;
  titulo: Caixa;
}

const MEDIR = `(() => {
  const caixa = (el) => {
    const r = el.getBoundingClientRect();
    return { esquerda: Math.round(r.left), largura: Math.round(r.width), topo: Math.round(r.top) };
  };
  const status = document.querySelector('[role="status"]');
  const grupo = document.querySelector("fieldset");
  return {
    acoes: [...status.querySelectorAll("a, button")].map(caixa),
    alternativa: caixa(grupo.querySelector(".grid.gap-2 > *")),
    larguraDaPagina: document.documentElement.scrollWidth,
    larguraDaJanela: window.innerWidth,
    larguraSemRolagem: document.documentElement.clientWidth,
    pergunta: caixa(grupo.querySelector(".grid.gap-2")),
    pontos: caixa(status.querySelector(".font-mono")),
    secao: caixa(document.getElementById("questionario")),
    titulo: caixa(status.querySelector("h2")),
  };
})()`;
const medir = () => avaliar<Medida>(enviar, MEDIR);

interface Divisoria {
  /** Do fim do enunciado ao bloco seguinte (a marca ou as alternativas). */
  ateOBloco: number;
  /** Do fim da linha ao topo do enunciado. */
  ateOEnunciado: number;
  esquerda: number;
  largura: number;
}

// A linha de cada pergunta é a borda de cima do primeiro contêiner com borda,
// subindo do fieldset até a seção.
const DIVISORIAS = `(() => {
  const secao = document.getElementById("questionario").getBoundingClientRect();
  return {
    perguntas: [...document.querySelectorAll("fieldset")].map((grupo) => {
      let el = grupo;
      while (parseFloat(getComputedStyle(el).borderTopWidth) === 0) el = el.parentElement;
      const linha = el.getBoundingClientRect();
      const fimDaLinha = linha.top + parseFloat(getComputedStyle(el).borderTopWidth);
      const legenda = grupo.querySelector("legend").getBoundingClientRect();
      const bloco = grupo.querySelector("legend ~ *").getBoundingClientRect();
      return {
        ateOEnunciado: Math.round(legenda.top - fimDaLinha),
        ateOBloco: Math.round(bloco.top - legenda.bottom),
        esquerda: Math.round(linha.left - secao.left),
        largura: Math.round(linha.width - secao.width),
      };
    }),
  };
})()`;
const divisorias = () =>
  avaliar<{ perguntas: Divisoria[] }>(enviar, DIVISORIAS);

const tecla = (key: "Enter" | "Tab", type: "keyDown" | "keyUp") =>
  enviar("Input.dispatchKeyEvent", {
    code: key,
    key,
    type,
    windowsVirtualKeyCode: key === "Enter" ? 13 : 9,
    ...(type === "keyDown" && key === "Enter" ? { text: "\r" } : {}),
  });

async function enterEm(rotulo: string) {
  await avaliar(
    enviar,
    `[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === ${JSON.stringify(rotulo)}).focus()`
  );
  await tecla("Enter", "keyDown");
  await tecla("Enter", "keyUp");
}

// O primeiro envio cai na rede e o foco fica no botão; o segundo vira o resultado.
async function enviarPeloEnter() {
  await enterEm("Enviar respostas");
  // O alerta entra antes do fim do pendente: espera o rótulo do reenvio.
  await esperar(
    `[...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Enviar de novo")`
  );
  await enterEm("Enviar de novo");
  await esperar(`document.querySelector('[role="status"]')`);
}

/** O que a árvore de acessibilidade do Chromium dá para o elemento com foco. */
async function anuncioDoFoco() {
  const { result } = (await enviar("Runtime.evaluate", {
    expression: "document.activeElement",
  })) as { result: { objectId: string } };
  const { nodes } = (await enviar("Accessibility.getPartialAXTree", {
    fetchRelatives: false,
    objectId: result.objectId,
  })) as {
    nodes: {
      description?: { value: string };
      name?: { value: string };
      role?: { value: string };
    }[];
  };
  return {
    descricao: nodes[0]?.description?.value,
    nome: nodes[0]?.name?.value,
    papel: nodes[0]?.role?.value,
  };
}

describe.skipIf(!existsSync(CHROMIUM))("o questionário no browser", () => {
  let pacote: string;

  beforeAll(async () => {
    [enviar, pacote] = await Promise.all([
      abrirChromium("questionario"),
      empacotar(),
    ]);
  }, 20_000);

  afterAll(fecharChromium);

  test("o envio que falha fica marcado; o reenvio vira o resultado; Tentar de novo abre outra tentativa", async () => {
    await abrir(1280, "", pacote);
    expect(await textoDe('[aria-disabled="true"]')).toBe("Enviar respostas");
    await marcarAsCertas();
    expect(await marcados()).toBe(3);
    // A escolha é Sol; o Céu fica para o foco e para a correção.
    expect(await marcada()).toEqual({
      borda: "rgb(255, 204, 1)",
      // O Chromium escreve o Sol a 8% em oklab.
      fundo: expect.stringMatching(OITO_POR_CENTO),
      letra: { cor: "rgb(34, 38, 43)", fundo: "rgb(255, 204, 1)" },
      raio: "23px",
    });
    expect(await textoDe("button:not([aria-disabled])")).toBe(
      "Enviar respostas"
    );

    await clicarNoBotao("Enviar respostas");
    await esperar(`document.querySelector('[role="alert"]')`);
    expect(await textoDe('[role="alert"]')).toBe(
      "Não deu para enviar. Suas respostas continuam marcadas; tente de novo."
    );
    expect(await marcados()).toBe(3);

    await clicarNoBotao("Enviar de novo");
    await esperar(`document.querySelector('[role="status"]')`);
    expect(await textoDe('[role="status"] h2')).toBe("Ainda não: 2 de 3 (67%)");
    expect(await textoDe('[role="status"] p')).toContain(
      "Você errou a pergunta 2."
    );
    const pedidos = await avaliar<
      { respostas: unknown[]; tentativaId: string }[]
    >(enviar, "window.pedidos");
    expect(pedidos).toHaveLength(2);
    expect(pedidos[0]?.tentativaId).toBe(pedidos[1]?.tentativaId);
    expect(pedidos[1]?.respostas).toHaveLength(3);

    await clicarNoBotao("Tentar de novo");
    await esperar(`document.querySelector('input[type="radio"]')`);
    expect(await marcados()).toBe(0);
    expect(await textoDe("h2")).toBe("Questionário");
    await marcarAsCertas();
    await clicarNoBotao("Enviar respostas");
    await esperar("window.pedidos.length === 3");
    const terceiro = await avaliar<{ tentativaId: string }[]>(
      enviar,
      "window.pedidos"
    );
    expect(terceiro[2]?.tentativaId).not.toBe(terceiro[0]?.tentativaId);
  });

  test("com o Enter em Enviar respostas, o foco vai para o resultado, que se anuncia pelo título e pela frase", async () => {
    await abrir(1280, "", pacote);
    await marcarAsCertas();
    await enviarPeloEnter();
    expect(
      await avaliar<string>(
        enviar,
        `document.activeElement === document.querySelector('[role="status"]') ? "resultado" : document.activeElement.tagName`
      )
    ).toBe("resultado");
    const anuncio = await anuncioDoFoco();
    expect(anuncio.nome).toBe("Ainda não: 2 de 3 (67%)");
    expect(anuncio.descricao).toStartWith("Você errou a pergunta 2.");
  });

  test("com o Enter em Tentar de novo, o foco vai para o título Questionário, que se anuncia com a regra", async () => {
    await abrir(1280, "", pacote);
    await marcarAsCertas();
    await enviarPeloEnter();
    await enterEm("Tentar de novo");
    await esperar(`document.querySelector('input[type="radio"]')`);
    expect(
      await avaliar<string>(
        enviar,
        "document.activeElement.tagName + ' ' + document.activeElement.textContent.trim()"
      )
    ).toBe("H2 Questionário");
    expect(await anuncioDoFoco()).toEqual({
      descricao: "3 perguntas · Para passar, 3 de 3",
      nome: "Questionário",
      papel: "heading",
    });
    // Foco é hover: o título não ganha contorno.
    expect(
      await avaliar<string>(
        enviar,
        "getComputedStyle(document.activeElement).outlineStyle"
      )
    ).toBe("none");
    // O Tab seguinte entra na primeira pergunta.
    await tecla("Tab", "keyDown");
    await tecla("Tab", "keyUp");
    expect(
      await avaliar<string>(
        enviar,
        "document.activeElement.closest('fieldset')?.querySelector('legend').textContent.trim() ?? document.activeElement.tagName"
      )
    ).toStartWith("1.");
  });

  test.each([
    ["respondendo", CRONOGRAMA],
    ["corrigido", { ...BLOQUEIO, ultima: REPROVADO_NA_PRIMEIRA }],
  ])(
    "%s: a linha de cada pergunta passa acima do enunciado, de borda a borda, e o enunciado encosta no bloco seguinte",
    async (_, q) => {
      await abrir(1280, htmlDe(q));
      const { perguntas } = await divisorias();
      expect(perguntas.length).toBeGreaterThan(0);
      for (const p of perguntas) {
        expect(p.esquerda).toBe(0);
        expect(p.largura).toBe(0);
        expect(p.ateOEnunciado).toBeGreaterThanOrEqual(16);
        expect(p.ateOBloco).toBeGreaterThanOrEqual(8);
        expect(p.ateOBloco).toBeLessThanOrEqual(16);
      }
    }
  );

  test("1280 px: o título e os pontos dividem a linha, e a alternativa ocupa a largura da pergunta", async () => {
    await abrir(1280, htmlDe({ ...BLOQUEIO, ultima: REPROVADO_NA_PRIMEIRA }));
    const m = await medir();
    expect(m.larguraDaPagina).toBeLessThanOrEqual(m.larguraDaJanela);
    expect(m.pontos.topo).toBeGreaterThanOrEqual(m.titulo.topo);
    expect(m.pontos.topo).toBeLessThan(m.titulo.topo + 28);
    expect(m.alternativa.largura).toBe(m.pergunta.largura);
    expect(m.acoes.map((a) => a.topo)).toEqual([
      m.acoes[0]?.topo,
      m.acoes[0]?.topo,
    ]);
  });

  test("entre o resultado e a pergunta 1 fica uma linha só, de 1 px", async () => {
    await abrir(1280, htmlDe({ ...BLOQUEIO, ultima: REPROVADO_NA_PRIMEIRA }));
    const linha = await avaliar<number>(
      enviar,
      `(() => {
        const resultado = document.getElementById("questionario").firstElementChild;
        const pergunta = document.querySelector("fieldset").parentElement;
        const larguraDe = (el, lado) => parseFloat(getComputedStyle(el)[lado]);
        return larguraDe(resultado, "borderBottomWidth") + larguraDe(pergunta, "borderTopWidth");
      })()`
    );
    expect(linha).toBe(1);
  });

  test("390 px: nada passa da janela, e Tentar de novo e Rever o vídeo preenchem a linha", async () => {
    await abrir(390, htmlDe({ ...BLOQUEIO, ultima: REPROVADO_NA_PRIMEIRA }));
    const m = await medir();
    expect(m.larguraDaPagina).toBeLessThanOrEqual(390);
    expect(m.secao.largura).toBe(m.larguraSemRolagem - 32);
    const linha = m.secao.largura - 36;
    expect(m.acoes).toHaveLength(2);
    for (const botao of m.acoes) {
      expect(botao.largura).toBeGreaterThanOrEqual((linha - 8) / 2);
      expect(botao.esquerda + botao.largura).toBeLessThanOrEqual(
        m.secao.esquerda + m.secao.largura - 18
      );
    }
    expect(m.alternativa.largura).toBe(m.pergunta.largura);
  });
});
