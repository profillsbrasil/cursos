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

const PARAGRAFO = /<\/?p[\s>]/g;

const GATILHO_DA_CATEGORIA =
  /<button([^>]*id="curso-categoriaId"[^>]*)>(.*?)<\/button>/;

/**
 * O que o gatilho da categoria mostra, e se é o placeholder. A lista aberta só
 * existe no browser, e o selecao.navegador.test.tsx a confere.
 */
function categoriaNoGatilho(html: string) {
  const [, atributos = "", conteudo = ""] =
    GATILHO_DA_CATEGORIA.exec(html) ?? [];
  return [texto(conteudo).trim(), atributos.includes(' data-placeholder=""')];
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
  codigo: "PE-001",
  documento: documentoDeExemplo("v1" as Versao),
  podeApagar: false,
  slug: "operacao-da-envasadora",
  uso: {
    assistidasPorAula: {},
    certificados: 0,
    liberacoes: 0,
    tentativasPorAula: {},
  },
};

const render = (edicao: EdicaoDoCurso) =>
  renderToStaticMarkup(
    <EditorDoCurso categorias={CATEGORIAS} edicao={edicao} />
  );

describe("editor do curso: endereço e categoria", () => {
  test("o curso salvo mostra o link como texto, fixo, sem campo de endereço", () => {
    const html = render(salvo);
    expect(texto(html)).toContain(
      "/cursos/operacao-da-envasadora fixo desde o primeiro salvamento"
    );
    expect(html).not.toContain('name="slug"');
  });

  test("o curso novo com título mostra o link que sairia dele", () => {
    const novo = edicaoDeCursoNovo(EDICAO.CURSO);
    const html = render({
      ...novo,
      documento: { ...novo.documento, titulo: "Ação: Reação Única" },
    });
    expect(texto(html)).toContain(
      "/cursos/acao-reacao-unica gerado a partir do título"
    );
  });

  test("a seleção da categoria mostra a categoria do curso", () => {
    expect(categoriaNoGatilho(render(salvo))).toEqual([
      "Processo de envase",
      false,
    ]);
  });

  test("nenhum <p> dentro de outro <p>, que o navegador desfaz e quebra a hidratação", () => {
    const novo = edicaoDeCursoNovo(EDICAO.CURSO);
    for (const html of [render(salvo), render(novo)]) {
      let abertos = 0;
      let aninhados = 0;
      for (const [tag] of html.matchAll(PARAGRAFO)) {
        if (tag.startsWith("</")) {
          abertos -= 1;
        } else {
          aninhados += abertos > 0 ? 1 : 0;
          abertos += 1;
        }
      }
      expect(aninhados).toBe(0);
    }
  });

  test("o curso novo diz que o link sai do título e começa sem categoria", () => {
    const html = render(edicaoDeCursoNovo(EDICAO.CURSO));
    expect(texto(html)).toContain("O link do curso sai do título.");
    expect(categoriaNoGatilho(html)).toEqual(["Escolha a categoria", true]);
  });
});

const H1 = /<h1[^>]*>(.*?)<\/h1>/;
const TITULO_ESCONDIDO =
  /<h2 class="sr-only" id="capa-e-descricao"[^>]*>Capa e descrição<\/h2>/;
const RESUMO_NO_INDICE = /^[^<]*?2 módulos, 3 aulas, 15 min Capa e descrição/;
const tituloDaTela = (html: string) => texto(H1.exec(html)?.[1] ?? "").trim();

describe("editor do curso: topo e código", () => {
  test("o curso novo se chama Novo curso, mesmo com título digitado, e o código sai ao salvar", () => {
    const novo = edicaoDeCursoNovo(EDICAO.CURSO);
    const html = render({
      ...novo,
      documento: { ...novo.documento, titulo: "Operação da envasadora" },
    });
    expect(tituloDaTela(html)).toBe("Novo curso");
    expect(texto(html)).toContain("Código Gerado ao salvar");
    expect(html).not.toContain('name="codigo"');
  });

  test("o curso salvo leva o título no topo e o código só para ler", () => {
    const html = render(salvo);
    expect(tituloDaTela(html)).toBe(salvo.documento.titulo);
    expect(texto(html)).toContain("Código PE-001");
    expect(html).not.toContain('name="codigo"');
    expect(html).not.toContain('name="destaque"');
  });

  test("a capa e a descrição abrem sem título visível, com nome para o leitor de tela e o índice", () => {
    const html = render(salvo);
    expect(html).toContain('<section aria-labelledby="capa-e-descricao"');
    expect(html).toMatch(TITULO_ESCONDIDO);
    expect(html).toContain('href="#capa-e-descricao"');
    expect(texto(html)).not.toContain("Vitrine");
  });

  test("a contagem de módulos e aulas sai do topo e abre o índice das seções", () => {
    const html = render(salvo);
    const indice = html.slice(html.indexOf('aria-label="Seções do editor"'));
    expect(texto(indice)).toMatch(RESUMO_NO_INDICE);
    expect(texto(html.slice(0, html.indexOf("</h1>")))).not.toContain(
      "módulos"
    );
  });
});
