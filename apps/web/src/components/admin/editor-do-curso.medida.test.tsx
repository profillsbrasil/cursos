import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import {
  documentoDeExemplo,
  EDICAO,
  perguntaDeExemplo,
  uuidDeExemplo,
} from "@cursos/api/dominio/exemplo";
import type { AlternativaId, PerguntaId } from "@cursos/api/dominio/tipos";
import { Switch } from "@cursos/ui/components/switch";
import { renderToStaticMarkup } from "react-dom/server";
import { ALAVANCA } from "../casca/campos";
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
const rascunho = {
  ...rascunhoDoCurso(documento),
  descricao: Array.from(
    { length: 6 },
    (_, i) => `Parágrafo ${i + 1} da descrição do curso.`
  ).join("\n\n"),
};
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
    capa={<CampoDeCapa aoEscolher={nada} arquivo={null} atual={CAPA} />}
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

const alavancas = renderToStaticMarkup(
  <div id="alavancas">
    <Switch checked className={ALAVANCA} />
    <Switch checked={false} className={ALAVANCA} />
  </div>
);

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  [vitrine, modulos, alavancas].flatMap((html) =>
    // O renderToStaticMarkup escreve o & do seletor da alavanca como &amp;.
    [...html.matchAll(CLASSES)].flatMap(([, c = ""]) =>
      c.replaceAll("&amp;", "&").split(ESPACO)
    )
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
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0"><main style="width:${conteudo}px;display:grid;gap:40px">${vitrine}${modulos}${alavancas}</main></body></html>`
    )}); document.close();`
  );
  await avaliar(
    enviar,
    "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))"
  );
}

interface Alavanca {
  altura: number;
  borda: string;
  fundo: string;
  largura: number;
  polegar: { fundo: string; lado: number; recuo: number; topo: number };
}

interface Medida {
  alavancas: [Alavanca, Alavanca];
  area: { altura: number; raio: string; rola: boolean };
  camada: string;
  campo: { altura: number; raio: string };
  capa: DOMRect;
  edicao: DOMRect;
  fontes: { aula: [string, string]; curso: [string, string] };
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
      const forma = (el) => ({ altura: el.getBoundingClientRect().height, raio: getComputedStyle(el).borderTopLeftRadius });
      const alavancas = [...document.querySelectorAll('#alavancas [data-slot="switch"]')].map((el) => {
        const r = el.getBoundingClientRect();
        const p = el.querySelector('[data-slot="switch-thumb"]');
        const q = p.getBoundingClientRect();
        return {
          altura: r.height,
          borda: getComputedStyle(el).borderTopColor,
          fundo: getComputedStyle(el).backgroundColor,
          largura: r.width,
          polegar: { fundo: getComputedStyle(p).backgroundColor, lado: q.width, recuo: q.left - r.left, topo: q.top - r.top },
        };
      });
      const fonte = (el) => [getComputedStyle(el).fontSize, getComputedStyle(el).fontWeight];
      return {
        alavancas,
        fontes: { aula: fonte(document.getElementById("aula-${EDICAO.A1}-titulo")), curso: fonte(document.getElementById("curso-titulo")) },
        area: { ...forma(document.getElementById("curso-descricao")), rola: (() => { const a = document.getElementById("curso-descricao"); return a.scrollHeight > a.clientHeight; })() },
        camada: getComputedStyle(document.getElementById("curso-capa").closest("label").querySelector("[aria-hidden]")).opacity,
        campo: forma(document.getElementById("curso-titulo")),
        capa: caixa(document.getElementById("curso-capa").closest("label")),
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

    test("a capa fica à esquerda do título, com 280 px, e a camada Trocar capa fica escondida", () => {
      expect(m.camada).toBe("0");
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

    test("a descrição do curso fica em 4 linhas e rola por dentro", () => {
      expect([m.area.altura, m.area.rola]).toEqual([4 * 21 + 21 + 2, true]);
    });

    test("com o foco no input da capa, a camada Trocar capa aparece", async () => {
      // Do começo da página, o Tab chega ao input da capa, o primeiro controle.
      const tecla = (type: string) =>
        enviar("Input.dispatchKeyEvent", {
          code: "Tab",
          key: "Tab",
          type,
          windowsVirtualKeyCode: 9,
        });
      await tecla("keyDown");
      await tecla("keyUp");
      const focado = await avaliar<string>(enviar, "document.activeElement.id");
      await avaliar(enviar, "new Promise((r) => setTimeout(r, 300))");
      expect([focado, (await medir()).camada]).toEqual(["curso-capa", "1"]);
    });

    test("o título do curso fica em 700 e 20 px, e o da aula em 600 e 18 px", () => {
      expect(m.fontes).toEqual({
        aula: ["18px", "600"],
        curso: ["20px", "700"],
      });
    });

    test("o campo é a pílula de 44 px, e a área de texto tem raio de 20 px", () => {
      expect(m.campo.altura).toBe(44);
      expect(Number.parseFloat(m.campo.raio)).toBeGreaterThanOrEqual(22);
      expect(m.area.raio).toBe("20px");
    });

    test("a alavanca tem 40 por 24 px, com o polegar de 18 px a 3 px da borda", () => {
      const [ligada, desligada] = m.alavancas;
      for (const a of m.alavancas) {
        expect([a.largura, a.altura, a.polegar.lado, a.polegar.topo]).toEqual([
          40, 24, 18, 3,
        ]);
      }
      expect(desligada.polegar.recuo).toBe(3);
      expect(ligada.polegar.recuo).toBe(40 - 3 - 18);
    });

    test("ligada é Sol com o polegar sobre-cor; desligada, o trilho com anel texto-apagado", () => {
      const [ligada, desligada] = m.alavancas;
      expect(ligada.fundo).toBe("rgb(255, 204, 1)");
      expect(ligada.polegar.fundo).toBe("rgb(34, 38, 43)");
      expect(desligada.fundo).toBe("rgb(77, 82, 87)");
      expect(desligada.borda).toBe("rgb(168, 172, 176)");
    });
  });

  // 1920 px de janela, menos a sidebar aberta e a moldura: a capa cresce com o bloco até 440 px.
  describe("em 1920 px", () => {
    let m: Medida;
    beforeAll(async () => {
      await abrirPagina(1920, 1576);
      m = await medir();
    });

    test("a capa cresce até 440 px, ao lado do título", () => {
      expect(Math.round(m.capa.width)).toBe(440);
      expect(m.titulo.left).toBeGreaterThan(m.capa.right);
    });

    test("a lista das aulas continua em 272 px, com o painel ao lado", () => {
      expect(Math.round(m.lista.width)).toBe(272);
      expect(m.painel.left).toBeGreaterThanOrEqual(m.lista.right);
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
