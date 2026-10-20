import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
    cartao: Caixa;
    haste: Caixa;
    medalhas: Caixa[];
    ponto: Caixa;
    preenchido: Caixa;
    trilho: Caixa;
    voce: Caixa;
  }>(`
    const t = document.querySelector("[data-trilha]");
    const trilho = t.querySelector("[data-trilho]");
    return {
      cartao: caixa(t),
      haste: caixa(t.querySelector("[data-haste]")),
      medalhas: [...t.querySelectorAll("ol > li > [data-medalha]")].map(caixa),
      ponto: caixa(t.querySelector("[data-ponto]")),
      preenchido: caixa(trilho.firstElementChild),
      trilho: caixa(trilho),
      voce: caixa(t.querySelector("[data-voce]")),
    };
  `);

const centro = (c: Caixa) => c.esquerda + c.largura / 2;
const meio = (c: Caixa) => c.topo + c.altura / 2;

const semana = () =>
  medir<{
    circulos: Caixa[];
    faixa: Caixa;
    fins: Caixa[];
    lista: Caixa;
    texto: Caixa;
  }>(`
    const faixa = document.querySelector("[data-sequencia]");
    return {
      circulos: [...faixa.querySelectorAll("[data-dia]")].map(caixa),
      faixa: caixa(faixa),
      fins: [...faixa.querySelectorAll("[data-fim-de-semana]")].map(caixa),
      lista: caixa(faixa.querySelector("ul")),
      texto: caixa(faixa.querySelector("h3").parentElement),
    };
  `);

/**
 * A marca "sáb e dom" como o Chromium a desenha: a escrita, o giro (`rotate` e
 * `transform`), a letra e o contraste da cor calculada contra o primeiro fundo
 * pintado atrás dela. O canvas converte qualquer cor (oklch, color-mix) para sRGB.
 */
const fimsDeSemana = () =>
  medir<
    {
      contraste: number;
      fonte: number;
      rotate: string;
      transform: string;
      writingMode: string;
    }[]
  >(`
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const rgb = (cor) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = cor;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const luz = ([r, g, b]) => {
      const c = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
    };
    const fundo = (el) => {
      for (let e = el; e; e = e.parentElement) {
        const cor = getComputedStyle(e).backgroundColor;
        if (cor !== "rgba(0, 0, 0, 0)" && cor !== "transparent") return cor;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    return [...document.querySelectorAll("[data-fim-de-semana]")].map((el) => {
      const s = getComputedStyle(el);
      const [a, b] = [luz(rgb(s.color)), luz(rgb(fundo(el)))].sort((x, y) => y - x);
      return {
        contraste: (a + 0.05) / (b + 0.05),
        fonte: parseFloat(s.fontSize),
        rotate: s.rotate,
        transform: s.transform,
        writingMode: s.writingMode,
      };
    });
  `);

const primeiras = () =>
  medir<Caixa[]>(
    `return [...document.querySelectorAll("[data-primeira-vez]")].map(caixa);`
  );

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

const rolaDeLado = () =>
  avaliar<boolean>(
    enviar,
    "document.documentElement.scrollWidth > document.documentElement.clientWidth"
  );

const FOTOS = process.env.FOTOS_DAS_CONQUISTAS;
async function foto(nome: string) {
  if (!FOTOS) {
    return;
  }
  const altura = await avaliar<number>(
    enviar,
    "document.documentElement.scrollHeight"
  );
  const largura = await avaliar<number>(enviar, "window.innerWidth");
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: altura,
    mobile: false,
    width: largura,
  });
  const { data } = (await enviar("Page.captureScreenshot", {
    format: "png",
  })) as { data: string };
  writeFileSync(join(FOTOS, `${nome}.png`), Buffer.from(data, "base64"));
}

describe.skipIf(!existsSync(CHROMIUM))("a tela Conquistas medida", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("conquistas");
  }, 20_000);

  afterAll(fecharChromium);

  for (const [nome, { feitas, html }] of Object.entries(TELAS)) {
    for (const largura of [1280, 390]) {
      test(`${largura} px, ${nome}: o pino liga a pílula ao ponto no trilho, e o preenchimento vai até ele`, async () => {
        await abrir(largura, html);
        const t = await trilha();
        const p = pontoNaTrilha(feitas, [10, 50, 100]);
        const ponto =
          t.trilho.esquerda + (p.porcento / 100) * t.trilho.largura - p.recuoPx;
        expect(centro(t.ponto)).toBeCloseTo(ponto, 0);
        expect(meio(t.ponto)).toBeGreaterThanOrEqual(t.trilho.topo);
        expect(meio(t.ponto)).toBeLessThanOrEqual(t.trilho.baixo);
        expect(meio(t.ponto)).toBeCloseTo(meio(t.trilho), 0);
        expect([t.ponto.largura, t.ponto.altura]).toEqual([14, 14]);
        expect(t.haste.largura).toBe(2);
        expect(centro(t.haste)).toBeCloseTo(ponto, 0);
        expect(t.haste.topo).toBeCloseTo(t.voce.baixo, 0);
        expect(t.haste.baixo).toBeCloseTo(meio(t.ponto), 0);
        expect(t.haste.esquerda).toBeGreaterThanOrEqual(t.voce.esquerda);
        expect(t.haste.direita).toBeLessThanOrEqual(t.voce.direita);
        expect(t.voce.esquerda).toBeGreaterThanOrEqual(t.cartao.esquerda);
        expect(t.voce.direita).toBeLessThanOrEqual(t.cartao.direita);
        if (feitas === 0) {
          expect(t.voce.esquerda).toBeLessThan(t.trilho.esquerda);
          expect(t.voce.esquerda).toBeGreaterThan(t.trilho.esquerda - 10);
        } else {
          expect(centro(t.voce)).toBeCloseTo(ponto, 0);
        }
        expect(t.preenchido.direita).toBeCloseTo(ponto, 0);
        expect(t.medalhas.map((m) => [m.largura, m.altura])).toEqual([
          [56, 56],
          [56, 56],
          [56, 56],
        ]);
        expect(centro(t.medalhas[2] as Caixa)).toBeCloseTo(
          t.trilho.direita - 28,
          0
        );
      });

      test(`${largura} px, ${nome}: a faixa dos sete dias é baixa, e sábado e domingo aparecem entre sexta e segunda`, async () => {
        await abrir(largura, html);
        const s = await semana();
        expect(s.circulos).toHaveLength(7);
        const lado = largura === 1280 ? 36 : 32;
        for (const c of s.circulos) {
          expect([c.largura, c.altura]).toEqual([lado, lado]);
        }
        if (largura === 1280) {
          expect(s.lista.topo).toBeLessThan(s.texto.baixo);
          expect(s.faixa.altura).toBeLessThan(120);
        } else {
          expect(s.lista.topo).toBeGreaterThanOrEqual(s.texto.baixo);
          expect(s.faixa.altura).toBeLessThan(220);
        }
        expect(s.lista.direita).toBeLessThanOrEqual(s.faixa.direita);
        const sextas = nome === "aluna" ? [3] : [0, 5];
        expect(s.fins).toHaveLength(sextas.length);
        for (const [i, sexta] of sextas.entries()) {
          const fim = s.fins[i] as Caixa;
          expect(fim.esquerda).toBeGreaterThanOrEqual(
            (s.circulos[sexta] as Caixa).direita
          );
          expect(fim.direita).toBeLessThanOrEqual(
            (s.circulos[sexta + 1] as Caixa).esquerda
          );
        }
      });

      test(`${largura} px, ${nome}: "sáb e dom" se lê na horizontal, em 12 px e com contraste de 4,5:1`, async () => {
        await abrir(largura, html);
        const fins = await fimsDeSemana();
        expect(fins.length).toBeGreaterThan(0);
        for (const f of fins) {
          expect(f.writingMode).toBe("horizontal-tb");
          expect([f.rotate, f.transform]).toEqual(["none", "none"]);
          expect(f.fonte).toBeGreaterThanOrEqual(12);
          expect(f.contraste).toBeGreaterThanOrEqual(4.5);
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
        expect(await rolaDeLado()).toBe(false);
        await foto(`conquistas-${nome}-${largura}`);
      });
    }
  }

  test("1280 px: as três primeiras vezes numa linha, e cinco cursos em 3 colunas", async () => {
    await abrir(1280, TELAS.aluna.html);
    const pv = await primeiras();
    expect(pv).toHaveLength(3);
    expect(new Set(pv.map((c) => c.topo)).size).toBe(1);
    expect(pv[1]?.esquerda).toBeGreaterThan(pv[0]?.direita ?? 0);
    expect(pv[2]?.esquerda).toBeGreaterThan(pv[1]?.direita ?? 0);
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
    const pv = await primeiras();
    expect(new Set(pv.map((c) => c.esquerda)).size).toBe(1);
    expect(pv[1]?.topo).toBeGreaterThan(pv[0]?.baixo ?? 0);
    expect(pv[2]?.topo).toBeGreaterThan(pv[1]?.baixo ?? 0);
    const cs = await cartoes();
    expect(new Set(cs.map((c) => c.cartao.esquerda)).size).toBe(1);
    expect(cs[0]?.cartao.largura).toBe(cs[0]?.grade.largura);
  });
});
