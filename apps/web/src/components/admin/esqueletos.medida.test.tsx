import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { existsSync } from "node:fs";

import { documentoDeExemplo, EDICAO } from "@cursos/api/dominio/exemplo";
import { renderToStaticMarkup } from "react-dom/server";

import {
  CabecalhoDaPagina,
  EsqueletoDoCabecalho,
} from "../casca/cabecalho-da-pagina";
import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
  avaliarComo,
} from "../chromium.test-utils";
import { ehLista, ehNumero, ehObjeto } from "../predicados.test-utils";
import { CampoDeCapa } from "./campo-de-capa";
import { EsqueletoDoEditor, EsqueletoDoTopoDaPessoa } from "./esqueletos";
import { FotoDaPessoa } from "./foto-da-pessoa";
import { rascunhoDoCurso } from "./rascunho-do-curso";
import { TopicosDoCurso } from "./topicos-do-curso";

const navegacao = await import("next/navigation");

mock.module("next/navigation", () => ({
  ...navegacao,
  useRouter: () => ({ refresh: () => undefined }),
}));

const { CapaEDescricao } = await import("./capa-e-descricao");

const nada = () => undefined;

const CAPA = {
  alt: "Capa",
  altura: 604,
  largura: 900,
  url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 604'/%3E",
};

const COLUNA_DE_PUBLICACAO = 300 + 32;

const pronto = renderToStaticMarkup(
  <CapaEDescricao
    capa={<CampoDeCapa aoEscolher={nada} arquivo={null} atual={CAPA} />}
    categorias={[{ cursos: [], id: EDICAO.CATEGORIA, nome: "Vendas" }]}
    despachar={nada}
    mudarTitulo={nada}
    rascunho={rascunhoDoCurso(documentoDeExemplo())}
    slug="curso-de-filmagem"
  />
);

const esqueleto = renderToStaticMarkup(<EsqueletoDoEditor />);

const topicos = renderToStaticMarkup(
  <TopicosDoCurso
    despachar={nada}
    topicos={["Planejar", "Gravar", "Iluminar", "Captar o som", "Editar"]}
  />
);

const foto = renderToStaticMarkup(
  <FotoDaPessoa foto={null} nome="Ana Admin" size="lg" />
);

const topo = renderToStaticMarkup(<EsqueletoDoTopoDaPessoa />);

const LIBERACOES = {
  resumo: "Marque pessoas para liberar um curso, ou abra uma para ver o acesso",
  titulo: "Liberações",
};

const cabecalho = renderToStaticMarkup(<CabecalhoDaPagina {...LIBERACOES} />);

const cabecalhoQueCarrega = renderToStaticMarkup(
  <EsqueletoDoCabecalho {...LIBERACOES} />
);

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;

const css = await cssDoApp(
  [
    pronto,
    esqueleto,
    topicos,
    foto,
    topo,
    cabecalho,
    cabecalhoQueCarrega,
  ].flatMap((html) =>
    [...html.matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO))
  )
);

let enviar: Enviar;

const larguraDoEsqueleto = (formulario: number) =>
  formulario + COLUNA_DE_PUBLICACAO >= 960
    ? formulario + COLUNA_DE_PUBLICACAO
    : formulario;

async function alturas(formulario: number) {
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0"><div id="pronto" style="width:${formulario}px">${pronto}</div><div id="topicos" style="width:${formulario}px">${topicos}</div><div id="esqueleto" style="width:${larguraDoEsqueleto(formulario)}px">${esqueleto}</div></body></html>`
    )}); document.close();`
  );

  return await avaliarComo(
    enviar,
    `new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r({
      pronto: document.querySelector("#pronto section > div").getBoundingClientRect().height,
      esqueleto: document.querySelector("#esqueleto .grid.gap-7 > :nth-child(2)").getBoundingClientRect().height,
      topicos: document.querySelector("#topicos section").getBoundingClientRect().height,
      esqueletoDosTopicos: document.querySelector("#esqueleto .grid.gap-10 > :nth-child(2)").getBoundingClientRect().height,
    }))))`,
    ehObjeto({
      esqueleto: ehNumero,
      esqueletoDosTopicos: ehNumero,
      pronto: ehNumero,
      topicos: ehNumero,
    })
  );
}

describe.skipIf(!existsSync(CHROMIUM))("esqueletos do admin no browser", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("esqueletos");
    await enviar("Emulation.setDeviceMetricsOverride", {
      deviceScaleFactor: 1,
      height: 900,
      mobile: false,
      width: 1920,
    });
  }, 20_000);

  afterAll(fecharChromium);

  test("a foto do topo da pessoa tem o lado da FotoDaPessoa grande", async () => {
    await avaliar(
      enviar,
      `document.open(); document.write(${JSON.stringify(
        `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0"><div id="foto">${foto}</div><div id="topo">${topo}</div></body></html>`
      )}); document.close();`
    );

    const lados = await avaliarComo(
      enviar,
      `({
        foto: document.querySelector('#foto [data-slot="avatar"]').getBoundingClientRect().width,
        topo: document.querySelector("#topo .rounded-full.shrink-0").getBoundingClientRect().width,
      })`,
      ehObjeto({ foto: ehNumero, topo: ehNumero })
    );

    expect(lados.foto).toBe(56);
    expect(lados.topo).toBe(lados.foto);
  });

  for (const largura of [358, 1086]) {
    test(`o cabeçalho tem a altura do pronto com ${largura} px`, async () => {
      await avaliar(
        enviar,
        `document.open(); document.write(${JSON.stringify(
          `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0"><div id="pronto" style="width:${largura}px">${cabecalho}</div><div id="esqueleto" style="width:${largura}px">${cabecalhoQueCarrega}</div></body></html>`
        )}); document.close();`
      );

      const lados = await avaliarComo(
        enviar,
        `["#pronto", "#esqueleto"].map((id) => document.querySelector(id).firstElementChild.getBoundingClientRect().height)`,
        ehLista(ehNumero)
      );

      expect(lados[1]).toBe(lados[0]);
    });
  }

  for (const formulario of [358, 754, 1234]) {
    test(`o cartão da capa tem a altura do pronto com ${formulario} px de coluna`, async () => {
      const { esqueleto: e, pronto: p } = await alturas(formulario);
      expect(Math.abs(e - p)).toBeLessThanOrEqual(4);
    });
  }

  for (const formulario of [358, 754, 1234]) {
    test(`O que você vai aprender tem a altura do pronto com ${formulario} px de coluna`, async () => {
      const { esqueletoDosTopicos: e, topicos: p } = await alturas(formulario);
      expect(Math.abs(e - p)).toBeLessThanOrEqual(4);
    });
  }
});
