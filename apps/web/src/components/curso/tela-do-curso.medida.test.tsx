import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import CarregandoCurso from "@/app/(aluno)/cursos/[slug]/loading";
import { LARGURAS_DA_SIDEBAR } from "@/components/casca/nav";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";
import { fabrica, HOJE } from "./exemplo-de-teste";
import { TelaDoCurso } from "./tela-do-curso";

const PAGINA = renderToStaticMarkup(
  <TelaDoCurso hoje={HOJE} pagina={fabrica.emAndamento} />
);
const ESQUELETO = renderToStaticMarkup(<CarregandoCurso />);

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const ENTIDADES: Record<string, string> = {
  "&#x27;": "'",
  "&amp;": "&",
  "&gt;": ">",
  "&lt;": "<",
  "&quot;": '"',
};
const ENTIDADE = /&(?:#x27|amp|gt|lt|quot);/g;
// O renderToStaticMarkup escapa a classe, e o Tailwind precisa dela como o browser a lê.
const semEntidades = (c: string) =>
  c.replace(ENTIDADE, (e) => ENTIDADES[e] ?? e);
const css = await cssDoApp(
  [PAGINA, ESQUELETO].flatMap((html) =>
    [...html.matchAll(CLASSES)].flatMap(([, c = ""]) =>
      semEntidades(c).split(ESPACO)
    )
  )
);

const CONTEUDO = `margin-left:${LARGURAS_DA_SIDEBAR["--sidebar-width"]};padding:32px 48px 64px`;

let enviar: Enviar;

async function abrir(largura: number, corpo: string) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 800,
    mobile: false,
    width: largura,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0;padding-bottom:800px"><main style="${CONTEUDO}">${corpo}</main></body></html>`
    )}); document.close(); window.scrollTo(0, 0);`
  );
}

interface Caixa {
  esquerda: number;
  largura: number;
  pe: number;
  topo: number;
}

interface Medida {
  aprender: Caixa;
  cabecalho: Caixa;
  capa: Caixa;
  cartao: Caixa;
  posicao: string;
}

const MEDIR = `(() => {
  const caixa = (el) => {
    const r = el.getBoundingClientRect();
    return { esquerda: Math.round(r.left), largura: Math.round(r.width), pe: Math.round(r.bottom), topo: Math.round(r.top) };
  };
  const cartao = document.querySelector('[aria-label="Seu progresso"]');
  return {
    aprender: caixa(document.querySelector('[aria-labelledby="o-que-voce-vai-aprender"]')),
    capa: caixa(cartao.querySelector("img").parentElement),
    cartao: caixa(cartao),
    cabecalho: caixa(document.querySelector("header")),
    posicao: getComputedStyle(cartao).position,
  };
})()`;

const medir = () => avaliar<Medida>(enviar, MEDIR);
const rolar = (y: number) => avaliar(enviar, `window.scrollTo(0, ${y})`);

describe.skipIf(!existsSync(CHROMIUM))("a grade da página do curso", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("pagina-do-curso");
  }, 20_000);

  afterAll(fecharChromium);

  test("1280 px: o cartão na coluna de 300 px, alinhado ao cabeçalho, a 36 px dele", async () => {
    await abrir(1280, PAGINA);
    const m = await medir();
    expect(m.cartao.largura).toBe(300);
    expect(m.cartao.topo).toBe(m.cabecalho.topo);
    expect(
      m.cartao.esquerda - (m.cabecalho.esquerda + m.cabecalho.largura)
    ).toBe(36);
    expect(m.capa.largura).toBe(300);
    expect(m.aprender.topo - m.cabecalho.pe).toBe(40);
  });

  test("1280 px: com a página rolada, o cartão fica preso a 24 px do topo", async () => {
    await abrir(1280, PAGINA);
    const antes = await medir();
    await rolar(200);
    const depois = await medir();
    expect(depois.posicao).toBe("sticky");
    expect(depois.cabecalho.topo).toBe(antes.cabecalho.topo - 200);
    expect(depois.cartao.topo).toBe(24);
  });

  test("1080 px: o cartão vem depois do cabeçalho, na largura toda, e rola com a página", async () => {
    await abrir(1080, PAGINA);
    const antes = await medir();
    expect(antes.cartao.esquerda).toBe(antes.cabecalho.esquerda);
    expect(antes.cartao.largura).toBe(antes.cabecalho.largura);
    expect(antes.cartao.topo - antes.cabecalho.pe).toBe(40);
    expect(antes.aprender.topo - antes.cartao.pe).toBe(40);
    await rolar(300);
    const depois = await medir();
    expect(depois.posicao).toBe("static");
    expect(depois.cartao.topo).toBe(antes.cartao.topo - 300);
  });

  test("1080 px: no cartão largo, a capa vai para o lado do texto", async () => {
    await abrir(1080, PAGINA);
    const m = await medir();
    expect(m.capa.esquerda).toBe(m.cartao.esquerda);
    expect(m.capa.largura).toBeLessThan(m.cartao.largura / 2);
    expect(m.capa.topo).toBe(m.cartao.topo);
    expect(m.capa.largura / (m.capa.pe - m.capa.topo)).toBeCloseTo(
      900 / 604,
      2
    );
  });

  test("resumo estreito: a linha que quebra começa no texto, sem o separador na frente", async () => {
    await abrir(560, PAGINA);
    const linhas = await avaliar<{ esquerda: number; inicio: number }[]>(
      enviar,
      `(() => {
        const p = [...document.querySelectorAll("header p")].find((x) => x.textContent.includes("módulo"));
        const esquerda = p.getBoundingClientRect().left;
        const andar = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
        const inicios = [];
        let topo = null;
        while (andar.nextNode()) {
          const faixa = document.createRange();
          faixa.selectNodeContents(andar.currentNode);
          const r = faixa.getClientRects()[0];
          if (r && topo !== null && r.top > topo + 2) {
            inicios.push({ esquerda: Math.round(esquerda), inicio: Math.round(r.left) });
          }
          if (r) topo = r.top;
        }
        return inicios;
      })()`
    );
    expect(linhas.length).toBeGreaterThan(0);
    for (const { esquerda, inicio } of linhas) {
      expect(inicio).toBe(esquerda);
    }
  });

  test("o esqueleto põe o cartão no mesmo lugar da página, nas duas grades", async () => {
    const cartaoDoEsqueleto = `(() => {
      const r = document.querySelector('[aria-busy="true"]').children[1].getBoundingClientRect();
      return { esquerda: Math.round(r.left), largura: Math.round(r.width), topo: Math.round(r.top) };
    })()`;
    for (const largura of [1280, 1080]) {
      // biome-ignore lint/performance/noAwaitInLoops: as duas larguras dividem a mesma aba do Chromium.
      await abrir(largura, PAGINA);
      const { cartao } = await medir();
      await abrir(largura, ESQUELETO);
      const esqueleto = await avaliar<Omit<Caixa, "pe">>(
        enviar,
        cartaoDoEsqueleto
      );
      expect({
        esquerda: esqueleto.esquerda,
        largura: esqueleto.largura,
      }).toEqual({ esquerda: cartao.esquerda, largura: cartao.largura });
    }
  });
});
