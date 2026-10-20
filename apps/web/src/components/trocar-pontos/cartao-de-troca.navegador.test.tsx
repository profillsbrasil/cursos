// O cartão sem saldo no Chromium headless: o nome que a árvore de acessibilidade
// dá ao botão é o que o leitor de tela fala. Sem Chromium na máquina, a suíte pula.

import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { existsSync } from "node:fs";
import type { CartaoDeTroca } from "@cursos/api/dominio/troca";
import { renderToString } from "react-dom/server";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";

// Fora do App Router o useRouter lança; o resto do módulo fica o de verdade.
const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  useRouter: () => ({
    push: () => undefined,
    refresh: () => undefined,
    replace: () => undefined,
  }),
}));

const { CursosParaTrocar } = await import("./cursos-para-trocar");

const curso = (id: string, titulo: string) =>
  ({
    aulas: 3,
    capa: { alt: "Capa", altura: 720, largura: 1280, url: "/capas/x.jpg" },
    categoria: "Envase",
    duracaoSeg: 900,
    id,
    slug: id,
    titulo,
  }) as CartaoDeTroca["curso"];

// renderToString, como o SSR do Next: os pedaços de texto vêm separados por
// comentário, e cada um vira um nó de texto no navegador.
const HTML = renderToString(
  <CursosParaTrocar
    cartoes={[
      {
        curso: curso("c-1", "Boas práticas de fabricação"),
        faltam: 190,
        pct: 5,
        preco: 200,
        saldo: 10,
        tipo: "faltam",
      },
      {
        curso: curso("c-2", "Atendimento pós-venda"),
        faltam: 1,
        pct: 99,
        preco: 300,
        saldo: 299,
        tipo: "faltam",
      },
      {
        curso: curso("c-3", "Portfólio de envasadoras"),
        preco: 500,
        tipo: "pode_trocar",
      },
    ]}
    extrato={[]}
    hoje="2026-10-14"
    retomar={{ href: "/meus-cursos", icone: null, texto: "Ver Meus cursos" }}
    temCursoTrocavelNaVitrine
  />
);

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  [...HTML.matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO))
);

let enviar: Enviar;

describe.skipIf(!existsSync(CHROMIUM))("os botões dos cartões de troca", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("cartao-de-troca");
    await enviar("Emulation.setDeviceMetricsOverride", {
      deviceScaleFactor: 1,
      height: 900,
      mobile: false,
      width: 1280,
    });
    await avaliar(
      enviar,
      `document.open(); document.write(${JSON.stringify(
        `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0">${HTML}</body></html>`
      )}); document.close();`
    );
  }, 20_000);

  afterAll(fecharChromium);

  test('o leitor de tela ouve "Faltam 190 pts", com o espaço', async () => {
    const { nodes } = (await enviar("Accessibility.getFullAXTree")) as {
      nodes: {
        ignored: boolean;
        name?: { value: string };
        role?: { value: string };
      }[];
    };
    const botoes = nodes
      .filter((n) => !n.ignored && n.role?.value === "button")
      .map((n) => n.name?.value);
    expect(botoes).toEqual([
      "Faltam 190 pts",
      "Falta 1 pt",
      "Trocar por 500 pts",
    ]);
  });
});
