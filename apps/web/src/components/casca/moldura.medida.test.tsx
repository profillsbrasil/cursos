// A Moldura no Chromium headless, com o CSS real do app: a sidebar sem borda, o
// painel do conteúdo e a moldura fixa que acompanha a largura da sidebar, aberta,
// recolhida e na transição do botão. Sem Chromium na máquina, tudo pula.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { Sidebar, SidebarInset } from "@cursos/ui/components/sidebar";
import { renderToStaticMarkup } from "react-dom/server";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";
import { ProvedorDaCasca } from "./provedor-da-casca";

const casca = (aberta: boolean) =>
  renderToStaticMarkup(
    <ProvedorDaCasca aberta={aberta}>
      <Sidebar collapsible="icon" variant="sidebar">
        <span>menu</span>
      </Sidebar>
      <SidebarInset>
        <div style={{ height: 3000 }}>conteúdo</div>
      </SidebarInset>
    </ProvedorDaCasca>
  );

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  [casca(true), casca(false)].flatMap((html) =>
    [...html.matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO))
  )
);

let enviar: Enviar;

async function abrirPagina(largura: number, corpo: string) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 800,
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

interface Medida {
  container: { borda: string; largura: number };
  fundoDoWrapper: string;
  moldura: {
    conteudo: string;
    direita: string;
    esquerda: string;
    posicao: string;
    pe: string;
    topo: string;
    transicao: string;
    z: string;
  };
  /** direita: do painel à borda da área útil da janela, sem a barra de rolagem. */
  painel: { direita: number; esquerda: number; pe: number; topo: number };
  rolagem: { documento: boolean; painel: string };
}

const MEDIR = `(() => {
  const $ = (s) => document.querySelector('[data-slot="' + s + '"]');
  const container = $("sidebar-container");
  const painel = $("sidebar-inset");
  const caixa = painel.getBoundingClientRect();
  const antes = getComputedStyle(painel, "::before");
  return {
    container: {
      borda: getComputedStyle(container).borderRightWidth,
      largura: container.getBoundingClientRect().width,
    },
    fundoDoWrapper: getComputedStyle($("sidebar-wrapper")).backgroundColor,
    moldura: {
      conteudo: antes.content,
      direita: antes.right,
      esquerda: antes.left,
      posicao: antes.position,
      pe: antes.bottom,
      topo: antes.top,
      transicao: antes.transitionDuration,
      z: antes.zIndex,
    },
    painel: {
      direita: document.documentElement.clientWidth - caixa.right,
      esquerda: caixa.left,
      pe: caixa.bottom,
      topo: caixa.top,
    },
    rolagem: {
      documento: document.scrollingElement.scrollHeight > innerHeight,
      painel: getComputedStyle(painel).overflowY,
    },
  };
})()`;

const medir = () => avaliar<Medida>(enviar, MEDIR);

const COR_DA_SIDEBAR = "rgb(40, 45, 51)";

describe.skipIf(!existsSync(CHROMIUM))("a Moldura no browser", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("moldura");
  }, 20_000);

  afterAll(fecharChromium);

  test("aberta: a moldura fixa começa onde a sidebar de 15,5 rem acaba", async () => {
    await abrirPagina(1280, casca(true));
    const m = await medir();
    expect(m.container).toEqual({ borda: "0px", largura: 248 });
    expect(m.fundoDoWrapper).toBe(COR_DA_SIDEBAR);
    expect(m.painel).toEqual({
      direita: 10,
      esquerda: 248,
      pe: 3010,
      topo: 10,
    });
    expect(m.moldura).toEqual({
      conteudo: '""',
      direita: "10px",
      esquerda: "248px",
      pe: "10px",
      posicao: "fixed",
      topo: "10px",
      transicao: "0s",
      z: "20",
    });
  });

  test("recolhida: 68 px de sidebar, sem borda, e a moldura vem junto", async () => {
    await abrirPagina(1280, casca(false));
    const m = await medir();
    expect(m.container).toEqual({ borda: "0px", largura: 68 });
    expect(m.painel.esquerda).toBe(68);
    expect(m.moldura.esquerda).toBe("68px");
  });

  test("a página rola pelo documento, e o painel termina 10 px acima do fim", async () => {
    await abrirPagina(1280, casca(true));
    await avaliar(enviar, "window.scrollTo(0, document.body.scrollHeight)");
    const m = await medir();
    expect(m.rolagem).toEqual({ documento: true, painel: "visible" });
    expect(m.painel.pe).toBe(790);
  });

  test("com data-animando, a moldura anda com a transição da largura", async () => {
    await abrirPagina(1280, casca(true));
    await avaliar(
      enviar,
      `document.querySelector('[data-slot="sidebar-wrapper"]').setAttribute("data-animando", "")`
    );
    expect((await medir()).moldura.transicao).toBe("0.2s");
  });

  test("com movimento reduzido, data-animando não anima a moldura", async () => {
    await enviar("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    try {
      await abrirPagina(1280, casca(true));
      await avaliar(
        enviar,
        `document.querySelector('[data-slot="sidebar-wrapper"]').setAttribute("data-animando", "")`
      );
      expect((await medir()).moldura.transicao).toBe("0s");
    } finally {
      await enviar("Emulation.setEmulatedMedia", { features: [] });
    }
  });

  test("abaixo de 768 px, nada de moldura", async () => {
    await abrirPagina(767, casca(true));
    const m = await medir();
    expect(m.fundoDoWrapper).toBe("rgba(0, 0, 0, 0)");
    expect(m.painel).toEqual({ direita: 0, esquerda: 0, pe: 3000, topo: 0 });
    expect(m.moldura.conteudo).toBe("none");
  });
});
