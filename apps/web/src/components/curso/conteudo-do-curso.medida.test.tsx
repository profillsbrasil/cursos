import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import type { PaginaDoCurso } from "@cursos/api/dominio/pagina-do-curso";
import { renderToStaticMarkup } from "react-dom/server";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";
import { ConteudoDoCurso } from "./conteudo-do-curso";
import { comercial } from "./exemplo-de-teste";

const TRES_LINHAS = "Linha um.\nLinha dois.\nLinha três.";
const LONGA =
  "Como montar o cronograma a partir da data que o cliente precisa da máquina rodando. ".repeat(
    12
  );

const BASE = comercial.emAndamento;
const PAGINA: PaginaDoCurso = {
  ...BASE,
  modulos: BASE.modulos.map((m) => ({
    ...m,
    aulas: m.aulas.map((a, i) => ({
      ...a,
      descricao: i === 0 ? TRES_LINHAS : LONGA,
    })),
  })),
};

const HTML = renderToStaticMarkup(<ConteudoDoCurso pagina={PAGINA} />);
const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  [...HTML.matchAll(CLASSES)].flatMap(([, c = ""]) =>
    c.replaceAll("&amp;", "&").split(ESPACO)
  )
);

let enviar: Enviar;

async function abrir(largura: number) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 800,
    mobile: false,
    width: largura,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0;padding:16px">${HTML}</body></html>`
    )}); document.close();`
  );
}

interface Linha {
  cartao: { direita: number; esquerda: number };
  descricoes: {
    altura: number;
    direita: number;
    entrelinha: number;
    esquerda: number;
  }[];
  duracao: { direita: number; esquerda: number };
  inicioDoTitulo: number;
  li: { direita: number; esquerda: number };
  titulo: string;
}

const LINHAS = `(() => {
  const cartao = document.querySelector("details").parentElement.getBoundingClientRect();
  return [...document.querySelectorAll("details[open] li")].map((li) => {
    const r = li.getBoundingClientRect();
    const duracao = li.children[2].getBoundingClientRect();
    const descricoes = [...li.querySelectorAll("p")].slice(1).map((p) => {
      const d = p.getBoundingClientRect();
      return { altura: Math.round(d.height), direita: Math.round(d.right), esquerda: Math.round(d.left), entrelinha: parseFloat(getComputedStyle(p).lineHeight) };
    });
    return {
      cartao: { direita: Math.round(cartao.right), esquerda: Math.round(cartao.left) },
      descricoes,
      duracao: { direita: Math.round(duracao.right), esquerda: Math.round(duracao.left) },
      li: { direita: Math.round(r.right), esquerda: Math.round(r.left) },
      inicioDoTitulo: Math.round(li.querySelector("p").getBoundingClientRect().left),
      titulo: li.querySelector("p").textContent,
    };
  });
})()`;

describe.skipIf(!existsSync(CHROMIUM))(
  "o índice de livro da página do curso",
  () => {
    beforeAll(async () => {
      enviar = await abrirChromium("indice-do-curso");
    }, 20_000);

    afterAll(fecharChromium);

    for (const largura of [1280, 390]) {
      test(`${largura} px: cada linha da aula vai de borda a borda do cartão, e o título não repete o número`, async () => {
        await abrir(largura);
        const linhas = await avaliar<Linha[]>(enviar, LINHAS);
        const aulas = PAGINA.modulos.find((m) =>
          m.aulas.some((a) => a.titulo === linhas[0]?.titulo)
        )?.aulas;
        expect(linhas.map((l) => l.titulo)).toEqual(
          aulas?.map((a) => a.titulo) ?? []
        );
        for (const l of linhas) {
          expect(l.li).toEqual(l.cartao);
        }
      });

      test(`${largura} px: a descrição fica em duas linhas no máximo e mantém as quebras do admin`, async () => {
        await abrir(largura);
        const linhas = await avaliar<Linha[]>(enviar, LINHAS);
        const [primeira, ...resto] = linhas;
        expect(primeira?.descricoes[0]?.altura).toBe(
          2 * (primeira?.descricoes[0]?.entrelinha ?? 0)
        );
        for (const l of resto) {
          const [d] = l.descricoes;
          expect(d?.altura).toBeLessThanOrEqual(2 * (d?.entrelinha ?? 0));
        }
      });
    }

    test("390 px: a descrição passa por baixo da duração e usa a largura da linha", async () => {
      await abrir(390);
      const linhas = await avaliar<Linha[]>(enviar, LINHAS);
      for (const l of linhas) {
        expect(l.descricoes[0]?.esquerda).toBe(l.inicioDoTitulo);
        expect(l.descricoes[0]?.direita).toBeGreaterThan(l.duracao.esquerda);
      }
    });

    test("1280 px: a descrição fica na coluna do título, antes da duração", async () => {
      await abrir(1280);
      const linhas = await avaliar<Linha[]>(enviar, LINHAS);
      for (const l of linhas) {
        expect(l.descricoes[0]?.esquerda).toBe(l.inicioDoTitulo);
        expect(l.descricoes[0]?.direita).toBeLessThanOrEqual(
          l.duracao.esquerda
        );
      }
    });
  }
);
