import { describe, expect, mock, test } from "bun:test";
import type { CategoriaNaLista } from "@cursos/api/dominio/categoria";
import {
  type EdicaoDoCurso,
  edicaoDeCursoNovo,
} from "@cursos/api/dominio/edicao-do-curso";
import {
  documentoDeExemplo,
  EDICAO,
  uuidDeExemplo,
} from "@cursos/api/dominio/exemplo";
import type { CategoriaId, Versao } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

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

const { EditorDoCurso } = await import("./editor-do-curso");

const TAG = /<[^>]+>/g;
const texto = (html: string) => html.replace(TAG, " ").replace(/\s+/g, " ");

const SELECT_DA_CATEGORIA =
  /<select[^>]*id="curso-categoriaId"[^>]*>(.*?)<\/select>/;
const OPCAO = /<option([^>]*)>([^<]*)<\/option>/g;
const VALOR = /value="([^"]*)"/;

/** [valor, texto, marcada] de cada opção do select da categoria. */
function opcoesDaCategoria(html: string) {
  const select = SELECT_DA_CATEGORIA.exec(html)?.[1] ?? "";
  return [...select.matchAll(OPCAO)].map(([, atributos = "", rotulo]) => [
    VALOR.exec(atributos)?.[1],
    rotulo,
    atributos.includes(' selected=""'),
  ]);
}

const OUTRA = uuidDeExemplo(32) as CategoriaId;
const CATEGORIAS: CategoriaNaLista[] = [
  {
    cursos: ["Fábrica e montagem"],
    id: EDICAO.CATEGORIA,
    nome: "Processo de envase",
  },
  { cursos: [], id: OUTRA, nome: "Vendas e negócios" },
];

const salvo: EdicaoDoCurso = {
  capa: { alt: "Capa", altura: 720, largura: 1280, url: "/capas/x.jpg" },
  documento: documentoDeExemplo("v1" as Versao),
  podeApagar: false,
  slug: "operacao-da-envasadora",
  uso: { assistidasPorAula: {}, certificados: 0, liberacoes: 0 },
};

const render = (edicao: EdicaoDoCurso) =>
  renderToStaticMarkup(
    <EditorDoCurso categorias={CATEGORIAS} edicao={edicao} />
  );

describe("editor do curso: endereço e categoria", () => {
  test("o curso salvo mostra o link como texto, sem campo de endereço", () => {
    const html = render(salvo);
    expect(texto(html)).toContain(
      "Link do curso: /cursos/operacao-da-envasadora"
    );
    expect(html).not.toContain('name="slug"');
  });

  test("o select da categoria lista as categorias e marca a do curso", () => {
    expect(opcoesDaCategoria(render(salvo))).toEqual([
      ["", "Escolha a categoria", false],
      [EDICAO.CATEGORIA, "Processo de envase", true],
      [OUTRA, "Vendas e negócios", false],
    ]);
  });

  test("o curso novo diz que o link sai do título e começa sem categoria", () => {
    const html = render(edicaoDeCursoNovo(EDICAO.CURSO));
    expect(texto(html)).toContain(
      "O link do curso sai do título quando você salvar pela primeira vez."
    );
    expect(opcoesDaCategoria(html)).toEqual([
      ["", "Escolha a categoria", true],
      [EDICAO.CATEGORIA, "Processo de envase", false],
      [OUTRA, "Vendas e negócios", false],
    ]);
  });
});
