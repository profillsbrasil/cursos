import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

import { cursoId } from "@cursos/api/dominio/marcas";
import type { CartaoDeTroca } from "@cursos/api/dominio/troca";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";

import { ComRoteador, roteadorDeTeste } from "@/components/roteador.test-utils";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium.test-utils";
import { CursosParaTrocar } from "./cursos-para-trocar";

const { chamadas, roteador } = roteadorDeTeste();

const renderizar = (no: ReactNode) =>
  renderToString(<ComRoteador roteador={roteador}>{no}</ComRoteador>);

const curso = (id: string, titulo: string): CartaoDeTroca["curso"] => ({
  aulas: 3,
  capa: { alt: "Capa", altura: 720, largura: 1280, url: "/capas/x.jpg" },
  categoria: "Envase",
  duracaoSeg: 900,
  id: cursoId(id),
  slug: id,
  titulo,
});

const HTML = renderizar(
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
    const { nodes } = await enviar("Accessibility.getFullAXTree");

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

test("renderizar não chama o roteador: nada navega no HTML do servidor", () => {
  expect(chamadas).toEqual([]);
});
