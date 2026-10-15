// O bloco aberto e o índice dos módulos no Chromium headless, com o CSS real
// do app. Cada suíte mede o que a revisão do PR 56 apontou: o título do módulo
// espremido em 768 px com a sidebar aberta, o salto do índice que parava com o
// cabeçalho embaixo do índice de duas linhas e o último número do índice
// esmaecido no fim da rolagem em 390 px. Sem Chromium na máquina, tudo pula.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { documentoDeExemplo, uuidDeExemplo } from "@cursos/api/dominio/exemplo";
import type { ModuloId } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";
import { NENHUM_ABERTO } from "./estado-do-editor";
import {
  BlocoDoModulo,
  ModulosDoCurso,
  reservarOTopo,
} from "./modulos-do-curso";
import { type RascunhoDoCurso, rascunhoDoCurso } from "./rascunho-do-curso";

const nada = () => undefined;
const LINHA_FECHADA = { chave: null, fechar: nada, pedir: nada };

const exemplo = rascunhoDoCurso(documentoDeExemplo());
const [modelo] = exemplo.modulos;
if (!modelo) {
  throw new Error("o exemplo não tem módulo");
}

/** O curso de 16 módulos da Profills School Comercial, sem as aulas. */
const MODULOS = Array.from({ length: 16 }, (_, i) => ({
  ...modelo,
  aulas: [],
  id: uuidDeExemplo(100 + i) as ModuloId,
  numero: String(i),
  titulo: `Módulo ${i}`,
}));
const dezesseis: RascunhoDoCurso = { ...exemplo, modulos: MODULOS };
const idDoModulo = (n: number) => (MODULOS[n] as (typeof MODULOS)[number]).id;

const blocoAberto = renderToStaticMarkup(
  <BlocoDoModulo
    assistidasPorAula={{}}
    bloco={{ tipo: "aberto" }}
    despachar={nada}
    indice={0}
    linhaAberta={LINHA_FECHADA}
    modulo={{ ...modelo, titulo: "Limpeza e higienização da envasadora" }}
    modulos={exemplo.modulos}
    mudarBlocos={nada}
    niveis={[{ nome: "Vendedor Profills Certificado", ordem: 1 }]}
  />
);
const listaFechada = renderToStaticMarkup(
  <ModulosDoCurso
    abertos={NENHUM_ABERTO}
    assistidasPorAula={{}}
    despachar={nada}
    linhaAberta={LINHA_FECHADA}
    marcados={new Set()}
    mudarBlocos={nada}
    rascunho={dezesseis}
  />
);

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  [blocoAberto, listaFechada].flatMap((html) =>
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
    )}); document.close();`
  );
}

const DEPOIS_DO_RENDER =
  "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))";

describe.skipIf(!existsSync(CHROMIUM))("bloco e índice no browser", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("modulos-do-curso");
  }, 20_000);

  afterAll(fecharChromium);

  describe("a grade do módulo aberto segue a largura do bloco, não a da janela", () => {
    const medirGrade = async (janela: number, bloco: number) => {
      await abrirPagina(
        janela,
        `<div style="width:${bloco}px">${blocoAberto}</div>`
      );
      return avaliar<{ nivelNaLinhaDoTitulo: boolean; titulo: number }>(
        enviar,
        `(() => {
          const titulo = document.querySelector('[id$="-titulo"]').getBoundingClientRect();
          const nivel = document.querySelector('select[id$="-nivel"]').getBoundingClientRect();
          return { nivelNaLinhaDoTitulo: nivel.top === titulo.top, titulo: titulo.width };
        })()`
      );
    };

    // 768 px de janela, menos a sidebar aberta (248 px) e a moldura (2 × 30,7 px).
    test("em 768 px com a sidebar aberta, o nível desce e o título fica com a linha", async () => {
      const grade = await medirGrade(768, 458);
      expect(grade.nivelNaLinhaDoTitulo).toBe(false);
      expect(grade.titulo).toBeGreaterThan(280);
    });

    // 1024 px de janela, menos a sidebar aberta e a moldura de 41 px de cada lado.
    test("em 1024 px com a sidebar aberta, número, título e nível dividem a linha", async () => {
      const grade = await medirGrade(1024, 694);
      expect(grade.nivelNaLinhaDoTitulo).toBe(true);
      expect(grade.titulo).toBeGreaterThan(256);
    });

    // 390 px de janela, menos a moldura de 16 px de cada lado.
    test("em 390 px, cada campo tem a linha inteira", async () => {
      const grade = await medirGrade(390, 358);
      expect(grade.nivelNaLinhaDoTitulo).toBe(false);
      expect(grade.titulo).toBe(358 - 40);
    });
  });

  describe("o índice de duas linhas, entre 768 e 1040 px", () => {
    let medida: {
      alturaDoIndice: number;
      foco: { fundoDoIndice: number; topo: number };
      salto: { fundoDoIndice: number; topo: number };
    };

    beforeAll(async () => {
      await abrirPagina(
        1024,
        `<main style="width:694px;margin-left:289px"><div style="height:600px"></div>${listaFechada}<div style="height:1200px"></div></main>`
      );
      await avaliar(
        enviar,
        `(${reservarOTopo.toString()})(document.querySelector("nav"))`
      );
      await avaliar(enviar, DEPOIS_DO_RENDER);
      medida = await avaliar(
        enviar,
        `(async () => {
          const nav = document.querySelector("nav");
          const depois = () => ${DEPOIS_DO_RENDER};
          const posicao = (id) => ({
            fundoDoIndice: nav.getBoundingClientRect().bottom,
            topo: document.getElementById(id).getBoundingClientRect().top,
          });
          // O irPara do índice: rola até o bloco e foca o cabeçalho sem rolar.
          document.getElementById("modulo-${idDoModulo(15)}").scrollIntoView();
          await depois();
          const salto = posicao("modulo-${idDoModulo(15)}");
          // Shift+Tab sobe para o cabeçalho de cima, que está embaixo do índice.
          document.getElementById("modulo-${idDoModulo(14)}-cabeca").focus();
          await depois();
          const foco = posicao("modulo-${idDoModulo(14)}-cabeca");
          return { alturaDoIndice: nav.offsetHeight, foco, salto };
        })()`
      );
    }, 20_000);

    test("o índice quebra em duas linhas", () => {
      expect(medida.alturaDoIndice).toBeGreaterThan(80);
    });

    test("o salto para o módulo 15 para abaixo do índice", () => {
      expect(medida.salto.topo).toBeGreaterThanOrEqual(
        medida.salto.fundoDoIndice
      );
    });

    test("o foco que sobe para o cabeçalho de cima não para embaixo do índice", () => {
      expect(medida.foco.topo).toBeGreaterThanOrEqual(
        medida.foco.fundoDoIndice
      );
    });
  });

  test("em 390 px, o último número do índice sai da máscara no fim da rolagem", async () => {
    await abrirPagina(390, `<main style="padding:16px">${listaFechada}</main>`);
    const folga = await avaliar<number>(
      enviar,
      `(() => {
        const fila = document.querySelector("nav ol");
        fila.scrollLeft = fila.scrollWidth;
        const ultimo = fila.querySelector("li:last-child a").getBoundingClientRect();
        return fila.getBoundingClientRect().right - ultimo.right;
      })()`
    );
    // A máscara vai a transparente nos últimos 2,5rem (40 px) da fila.
    expect(folga).toBeGreaterThanOrEqual(40);
  });
});
