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
import { UM_GERAL, VARIOS } from "./exemplo-de-teste";
import { TelaDeComunicados } from "./tela-de-comunicados";

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
  geral: naCasca(<TelaDeComunicados comunicados={UM_GERAL} />),
  varios: naCasca(<TelaDeComunicados comunicados={VARIOS} />),
};

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  Object.values(TELAS).flatMap((html) =>
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
  direita: number;
  esquerda: number;
  fundo: number;
  largura: number;
  topo: number;
}

interface Medida {
  cartao: Caixa;
  dias: Caixa[];
  lado: Caixa;
  linhas: Caixa[];
  rolaDeLado: boolean;
  titulo: Caixa;
}

const medir = () =>
  avaliar<Medida>(
    enviar,
    `(() => {
      const caixa = (el) => {
        const r = el.getBoundingClientRect();
        return { altura: Math.round(r.height), direita: Math.round(r.right), esquerda: Math.round(r.left), fundo: Math.round(r.bottom), largura: Math.round(r.width), topo: Math.round(r.top) };
      };
      const cartao = document.querySelector("[data-destaque]");
      return {
        cartao: caixa(cartao),
        dias: [...document.querySelectorAll("ol > li > time")].map(caixa),
        lado: caixa(cartao.querySelector("[data-capa]") ?? cartao.querySelector("span[aria-hidden]")),
        linhas: [...document.querySelectorAll("ol > li")].map(caixa),
        rolaDeLado: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        titulo: caixa(cartao.querySelector("h2")),
      };
    })()`
  );

describe.skipIf(!existsSync(CHROMIUM))("a tela Comunicados medida", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("comunicados");
  }, 20_000);

  afterAll(fecharChromium);

  test("1280 px: a capa de 240 px à direita do texto, no topo do destaque, e o dia na coluna de 64 px", async () => {
    await abrir(1280, TELAS.varios);
    const m = await medir();
    expect(m.lado.largura).toBe(240);
    expect(m.lado.altura).toBe(Math.round((240 * 604) / 900));
    expect(m.lado.esquerda).toBeGreaterThanOrEqual(m.titulo.direita + 28);
    expect(m.lado.topo).toBeLessThan(m.titulo.topo);
    expect(m.dias).toHaveLength(3);
    for (const d of m.dias) {
      expect(d.largura).toBe(64);
    }
    expect(m.rolaDeLado).toBe(false);
  });

  test("390 px: a capa sobe para cima do título na largura do cartão, e o dia fica em 44 px", async () => {
    await abrir(390, TELAS.varios);
    const m = await medir();
    expect(m.lado.fundo).toBeLessThanOrEqual(m.titulo.topo);
    expect(m.lado.largura).toBe(m.titulo.largura);
    for (const d of m.dias) {
      expect(d.largura).toBe(44);
    }
    for (const l of m.linhas) {
      expect(l.direita).toBeLessThanOrEqual(390);
    }
    expect(m.rolaDeLado).toBe(false);
  });

  test("o geral: o megafone de 44 px à direita em 1280 px e acima do título em 390 px", async () => {
    await abrir(1280, TELAS.geral);
    const largo = await medir();
    expect([largo.lado.largura, largo.lado.altura]).toEqual([44, 44]);
    expect(largo.lado.esquerda).toBeGreaterThan(largo.titulo.direita);
    await abrir(390, TELAS.geral);
    const estreito = await medir();
    expect(estreito.lado.fundo).toBeLessThanOrEqual(estreito.titulo.topo);
    expect(estreito.rolaDeLado).toBe(false);
  });
});
