import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { Sidebar, SidebarInset } from "@cursos/ui/components/sidebar";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProvedorDaCasca } from "@/components/casca/provedor-da-casca";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";
import { ALUNA, NOVO } from "./exemplo-de-teste";
import { pontoNaTrilha } from "./geometria";
import { TelaDeConquistas } from "./tela-de-conquistas";

const naCasca = (filhos: ReactNode) =>
  renderToStaticMarkup(
    <ProvedorDaCasca aberta>
      <Sidebar collapsible="icon" variant="sidebar">
        <span>menu</span>
      </Sidebar>
      <SidebarInset>
        <div className="min-w-0 px-[clamp(1rem,4vw,3rem)] pt-8 pb-16">
          {filhos}
        </div>
      </SidebarInset>
    </ProvedorDaCasca>
  );

const TELAS = {
  aluna: { feitas: 49, html: naCasca(<TelaDeConquistas conquistas={ALUNA} />) },
  novo: { feitas: 0, html: naCasca(<TelaDeConquistas conquistas={NOVO} />) },
};

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  Object.values(TELAS).flatMap(({ html }) =>
    [...html.matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO))
  )
);

let enviar: Enviar;

async function abrir(largura: number, corpo: string) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 900,
    mobile: false,
    width: largura,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0">${corpo}</body></html>`
    )}); document.close(); window.scrollTo(0, 0);`
  );
}

interface Caixa {
  altura: number;
  baixo: number;
  direita: number;
  esquerda: number;
  largura: number;
  topo: number;
}

const CAIXA = `const caixa = (el) => {
  const r = el.getBoundingClientRect();
  return { altura: r.height, baixo: r.bottom, direita: r.right, esquerda: r.left, largura: r.width, topo: r.top };
};`;

const medir = <T,>(corpo: string) =>
  avaliar<T>(enviar, `(() => { ${CAIXA} ${corpo} })()`);

const trilha = () =>
  medir<{
    medalhas: Caixa[];
    preenchido: Caixa;
    trilho: Caixa;
    voce: Caixa;
  }>(`
    const voce = document.querySelector("[data-voce]");
    const trilho = voce.nextElementSibling;
    return {
      medalhas: [...document.querySelectorAll("[data-trilha] ol > li > [data-medalha]")].map(caixa),
      preenchido: caixa(trilho.firstElementChild),
      trilho: caixa(trilho),
      voce: caixa(voce),
    };
  `);

const centro = (c: Caixa) => c.esquerda + c.largura / 2;

const semana = () =>
  medir<{ circulos: Caixa[]; colunas: Caixa[] }>(`
    const circulos = [...document.querySelectorAll("[data-dia]")];
    return { circulos: circulos.map(caixa), colunas: circulos.map((c) => caixa(c.parentElement)) };
  `);

const cartoes = () =>
  medir<
    {
      cartao: Caixa;
      capa: Caixa;
      cabe: boolean;
      grade: Caixa;
      lacre: Caixa;
    }[]
  >(`
    return [...document.querySelectorAll('[aria-labelledby="conquistas-certificados"] ol > li > a')].map((a) => ({
      cartao: caixa(a),
      capa: caixa(a.firstElementChild),
      cabe: [...a.querySelectorAll("*")].every((el) => el.getBoundingClientRect().right <= a.getBoundingClientRect().right + 0.5 || el.closest("[aria-hidden]")),
      grade: caixa(a.closest("ol")),
      lacre: caixa(a.querySelector("[data-medalha]")),
    }));
  `);

const blocos = () =>
  medir<{ caixa: Caixa; cabe: boolean }[]>(`
    return [...document.querySelector("[data-sequencia]").parentElement.children].map((b) => ({
      caixa: caixa(b),
      cabe: b.scrollWidth <= b.clientWidth,
    }));
  `);

const rolaDeLado = () =>
  avaliar<boolean>(
    enviar,
    "document.documentElement.scrollWidth > document.documentElement.clientWidth"
  );

describe.skipIf(!existsSync(CHROMIUM))("a tela Conquistas medida", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("conquistas");
  }, 20_000);

  afterAll(fecharChromium);

  for (const [nome, { feitas, html }] of Object.entries(TELAS)) {
    for (const largura of [1280, 390]) {
      test(`${largura} px, ${nome}: a pílula Você no ponto da trilha, e o preenchimento até ele`, async () => {
        await abrir(largura, html);
        const t = await trilha();
        const p = pontoNaTrilha(feitas, [10, 50, 100]);
        const ponto =
          t.trilho.esquerda + (p.porcento / 100) * t.trilho.largura - p.recuoPx;
        if (feitas === 0) {
          expect(t.voce.esquerda).toBeCloseTo(t.trilho.esquerda, 0);
        } else {
          expect(centro(t.voce)).toBeCloseTo(ponto, 0);
        }
        expect(t.preenchido.direita).toBeCloseTo(ponto, 0);
        expect(t.medalhas.map((m) => [m.largura, m.altura])).toEqual([
          [56, 56],
          [56, 56],
          [56, 56],
        ]);
        const naMeta = pontoNaTrilha(10, [10, 50, 100]);
        expect(centro(t.medalhas[0] as Caixa)).toBeCloseTo(
          t.trilho.esquerda +
            (naMeta.porcento / 100) * t.trilho.largura -
            naMeta.recuoPx,
          0
        );
        expect(centro(t.medalhas[2] as Caixa)).toBeCloseTo(
          t.trilho.direita - 28,
          0
        );
      });

      test(`${largura} px, ${nome}: os sete dias em colunas iguais`, async () => {
        await abrir(largura, html);
        const { circulos, colunas } = await semana();
        expect(circulos).toHaveLength(7);
        const lado = largura === 1280 ? 36 : 32;
        for (const c of circulos) {
          expect([c.largura, c.altura]).toEqual([lado, lado]);
        }
        const [primeira] = colunas;
        for (const c of colunas) {
          expect(c.largura).toBeCloseTo(primeira?.largura ?? 0, 1);
          expect(centro(circulos[colunas.indexOf(c)] as Caixa)).toBeCloseTo(
            centro(c),
            0
          );
        }
      });

      test(`${largura} px, ${nome}: os cartões cabem na coluna, e o lacre fica na borda da capa`, async () => {
        await abrir(largura, html);
        const cs = await cartoes();
        expect(cs.length).toBeGreaterThan(0);
        for (const c of cs) {
          expect(c.cabe).toBe(true);
          expect(c.cartao.direita).toBeLessThanOrEqual(c.grade.direita + 0.5);
          expect(c.lacre.topo + c.lacre.altura / 2).toBeCloseTo(
            c.capa.baixo,
            0
          );
          expect([c.lacre.largura, c.lacre.altura]).toEqual([56, 56]);
          expect(c.lacre.direita).toBeCloseTo(c.cartao.direita - 18, 0);
        }
        for (const b of await blocos()) {
          expect(b.cabe).toBe(true);
        }
        expect(await rolaDeLado()).toBe(false);
      });
    }
  }

  test("1280 px: os dois cartões lado a lado, e cinco cursos em 3 colunas", async () => {
    await abrir(1280, TELAS.aluna.html);
    const [sequencia, primeiras] = await blocos();
    expect(sequencia?.caixa.topo).toBe(primeiras?.caixa.topo);
    expect(sequencia?.caixa.largura).toBeCloseTo(
      primeiras?.caixa.largura ?? 0,
      0
    );
    const cs = await cartoes();
    expect(new Set(cs.slice(0, 3).map((c) => c.cartao.topo)).size).toBe(1);
    expect(cs[3]?.cartao.topo).toBeGreaterThan(cs[0]?.cartao.baixo ?? 0);
    expect(cs[3]?.cartao.esquerda).toBe(cs[0]?.cartao.esquerda);
  });

  test("1280 px: o curso único para em 360 px", async () => {
    await abrir(1280, TELAS.novo.html);
    const [c] = await cartoes();
    expect(c?.cartao.largura).toBe(360);
  });

  test("390 px: tudo numa coluna", async () => {
    await abrir(390, TELAS.aluna.html);
    const [sequencia, primeiras] = await blocos();
    expect(primeiras?.caixa.topo).toBeGreaterThan(sequencia?.caixa.baixo ?? 0);
    const cs = await cartoes();
    expect(new Set(cs.map((c) => c.cartao.esquerda)).size).toBe(1);
    expect(cs[0]?.cartao.largura).toBe(cs[0]?.grade.largura);
  });
});
