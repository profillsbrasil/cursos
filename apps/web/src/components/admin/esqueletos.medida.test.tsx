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
} from "../chromium-de-teste";
import { CampoDeCapa } from "./campo-de-capa";
import { EsqueletoDoEditor, EsqueletoDoTopoDaPessoa } from "./esqueletos";
import { FotoDaPessoa } from "./foto-da-pessoa";
import { rascunhoDoCurso } from "./rascunho-do-curso";

// Fora do App Router o useRouter lança; a categoria da Capa e descrição cria pelo useAcao.
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
  [pronto, esqueleto, foto, topo, cabecalho, cabecalhoQueCarrega].flatMap(
    (html) =>
      [...html.matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO))
  )
);

let enviar: Enviar;

// De 960 px de container para cima, o editor põe a coluna de publicação ao lado.
const larguraDoEsqueleto = (formulario: number) =>
  formulario + COLUNA_DE_PUBLICACAO >= 960
    ? formulario + COLUNA_DE_PUBLICACAO
    : formulario;

// O cartão da capa pronto numa coluna de `formulario` px, e o esqueleto inteiro
// na largura que deixa a coluna dele com os mesmos `formulario` px.
async function alturas(formulario: number) {
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0"><div id="pronto" style="width:${formulario}px">${pronto}</div><div id="esqueleto" style="width:${larguraDoEsqueleto(formulario)}px">${esqueleto}</div></body></html>`
    )}); document.close();`
  );
  return avaliar<{ esqueleto: number; pronto: number }>(
    enviar,
    `new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r({
      pronto: document.querySelector("#pronto section > div").getBoundingClientRect().height,
      esqueleto: document.querySelector("#esqueleto .grid.gap-7 > :nth-child(2)").getBoundingClientRect().height,
    }))))`
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
    const lados = await avaliar<{ foto: number; topo: number }>(
      enviar,
      `({
        foto: document.querySelector('#foto [data-slot="avatar"]').getBoundingClientRect().width,
        topo: document.querySelector("#topo .rounded-full.shrink-0").getBoundingClientRect().width,
      })`
    );
    expect(lados.topo).toBe(lados.foto);
  });

  // 358 px é o conteúdo em 390 px de janela, onde o resumo de Liberações quebra.
  for (const largura of [358, 1086]) {
    test(`o cabeçalho tem a altura do pronto com ${largura} px`, async () => {
      await avaliar(
        enviar,
        `document.open(); document.write(${JSON.stringify(
          `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0"><div id="pronto" style="width:${largura}px">${cabecalho}</div><div id="esqueleto" style="width:${largura}px">${cabecalhoQueCarrega}</div></body></html>`
        )}); document.close();`
      );
      const lados = await avaliar<number[]>(
        enviar,
        `["#pronto", "#esqueleto"].map((id) => document.querySelector(id).firstElementChild.getBoundingClientRect().height)`
      );
      expect(lados[1]).toBe(lados[0]);
    });
  }

  // 358 px é a coluna do editor em 390 px de janela.
  // 754 px é a coluna do editor em 1440 px com a sidebar aberta: a capa fica sobre os campos.
  // 1234 px é a de 1920 px: a capa fica ao lado deles.
  for (const formulario of [358, 754, 1234]) {
    test(`o cartão da capa tem a altura do pronto com ${formulario} px de coluna`, async () => {
      const { esqueleto: e, pronto: p } = await alturas(formulario);
      expect(Math.abs(e - p)).toBeLessThanOrEqual(4);
    });
  }
});
