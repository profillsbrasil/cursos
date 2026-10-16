import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import {
  documentoDeExemplo,
  EDICAO,
  perguntaDeExemplo,
  uuidDeExemplo,
} from "@cursos/api/dominio/exemplo";
import type { AlternativaId, PerguntaId } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";
import { CampoDeCapa } from "./campo-de-capa";
import { escolhas, NADA_ESCOLHIDO } from "./estado-do-editor";
import { ModulosDoCurso } from "./modulos-do-curso";
import { rascunhoDoCurso } from "./rascunho-do-curso";
import { Vitrine } from "./vitrine";

const nada = () => undefined;
const LINHA_FECHADA = { chave: null, fechar: nada, pedir: nada };

const documento = documentoDeExemplo();
const a1 = documento.modulos[0]?.aulas[0];
if (!a1) {
  throw new Error("o exemplo não tem aula");
}
a1.perguntas = [
  perguntaDeExemplo(
    EDICAO.P1,
    [EDICAO.P1A, EDICAO.P1B],
    "Por onde o cronograma reverso começa?"
  ),
  perguntaDeExemplo(
    uuidDeExemplo(42) as PerguntaId,
    [uuidDeExemplo(55) as AlternativaId, uuidDeExemplo(56) as AlternativaId],
    "A linha do cliente precisa rodar em 1º de março, e a fabricação leva 90 dias. O que o cronograma reverso mostra?"
  ),
];
const rascunho = rascunhoDoCurso(documento);
const [m1] = rascunho.modulos;
if (!m1) {
  throw new Error("o exemplo não tem módulo");
}
const CAPA = {
  alt: "Capa",
  altura: 604,
  largura: 900,
  url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 604'/%3E",
};

const vitrine = renderToStaticMarkup(
  <Vitrine
    capa={
      <CampoDeCapa
        alt="Capa"
        aoEscolher={nada}
        arquivo={null}
        atual={CAPA}
        geracao={0}
        mudarAlt={nada}
      />
    }
    categorias={[{ cursos: [], id: EDICAO.CATEGORIA, nome: "Vendas" }]}
    despachar={nada}
    mudarTexto={nada}
    rascunho={rascunho}
    slug="curso"
  />
);
const modulos = renderToStaticMarkup(
  <ModulosDoCurso
    abertos={new Set([m1.id])}
    assistidasPorAula={{}}
    despachar={nada}
    escolhas={escolhas(NADA_ESCOLHIDO, {
      aulaId: EDICAO.A1,
      moduloId: m1.id,
      tipo: "aula_escolhida",
    })}
    linhaAberta={LINHA_FECHADA}
    marcados={new Set()}
    mudarBlocos={nada}
    mudarEscolhas={nada}
    rascunho={rascunho}
  />
);

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  [vitrine, modulos].flatMap((html) =>
    [...html.matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO))
  )
);

let enviar: Enviar;

async function abrirPagina(janela: number, conteudo: number) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 900,
    mobile: false,
    width: janela,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0"><main style="width:${conteudo}px;display:grid;gap:40px">${vitrine}${modulos}</main></body></html>`
    )}); document.close();`
  );
  await avaliar(
    enviar,
    "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))"
  );
}

interface Medida {
  capa: DOMRect;
  edicao: DOMRect;
  lista: DOMRect;
  painel: DOMRect;
  perguntas: DOMRect;
  titulo: DOMRect;
  transborda: string | null;
}

const medir = () =>
  avaliar<Medida>(
    enviar,
    `(() => {
      const caixa = (el) => el.getBoundingClientRect().toJSON();
      const painel = document.querySelector('[aria-label="Aula escolhida"]');
      const limite = painel.getBoundingClientRect().right + 1;
      let transborda = null;
      painel.querySelectorAll("*").forEach((x) => {
        if (!transborda && x.getBoundingClientRect().right > limite) {
          transborda = x.tagName + "#" + x.id + "/" + Math.round(x.getBoundingClientRect().right - limite);
        }
      });
      return {
        capa: caixa(document.getElementById("curso-capa").closest(".grid")),
        edicao: caixa(document.getElementById("pergunta-${EDICAO.P1}-enunciado").closest(".grid")),
        lista: caixa(document.querySelector('ol[aria-label^="Aulas do módulo"]').parentElement),
        painel: caixa(painel),
        perguntas: caixa(document.querySelector('ol[aria-label="Perguntas"]').parentElement),
        titulo: caixa(document.getElementById("curso-titulo")),
        transborda,
      };
    })()`
  );

describe.skipIf(!existsSync(CHROMIUM))("editor no browser", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("editor-do-curso");
  }, 20_000);

  afterAll(fecharChromium);

  // 1280 px de janela, menos a sidebar aberta (248 px) e a moldura de 3rem de cada lado.
  describe("em 1280 px", () => {
    let m: Medida;
    beforeAll(async () => {
      await abrirPagina(1280, 936);
      m = await medir();
    });

    test("a capa fica à esquerda do título, com 280 px", () => {
      expect(Math.round(m.capa.width)).toBe(280);
      expect(m.titulo.left).toBeGreaterThan(m.capa.right);
    });

    test("a lista das aulas tem 272 px e o painel fica ao lado dela", () => {
      expect(Math.round(m.lista.width)).toBe(272);
      expect(m.painel.left).toBeGreaterThanOrEqual(m.lista.right);
      expect(m.painel.top).toBe(m.lista.top);
    });

    test("a lista das perguntas tem 200 px e a pergunta em edição fica ao lado", () => {
      expect(Math.round(m.perguntas.width)).toBe(200);
      expect(m.edicao.left).toBeGreaterThanOrEqual(m.perguntas.right);
    });

    test("nada transborda o painel da aula", () => {
      expect(m.transborda).toBeNull();
    });
  });

  // 390 px de janela, menos a moldura de 16 px de cada lado.
  describe("em 390 px", () => {
    let m: Medida;
    beforeAll(async () => {
      await abrirPagina(390, 358);
      m = await medir();
    });

    test("a capa fica em cima do título, na largura toda", () => {
      expect(Math.round(m.capa.width)).toBe(358 - 48);
      expect(m.titulo.top).toBeGreaterThan(m.capa.bottom);
    });

    test("o painel desce para baixo da lista das aulas, e as duas têm a largura do bloco", () => {
      expect(m.painel.top).toBeGreaterThanOrEqual(m.lista.bottom);
      expect(Math.round(m.lista.width)).toBe(358);
      expect(Math.round(m.painel.width)).toBe(358);
    });

    test("a pergunta em edição desce para baixo da lista das perguntas", () => {
      expect(m.edicao.top).toBeGreaterThanOrEqual(m.perguntas.bottom);
      expect(Math.round(m.perguntas.width)).toBe(Math.round(m.edicao.width));
    });

    test("nada transborda o painel da aula", () => {
      expect(m.transborda).toBeNull();
    });
  });
});
