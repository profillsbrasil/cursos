import { describe, expect, mock, test } from "bun:test";
import type { CategoriaNaLista } from "@cursos/api/dominio/categoria";
import type { CategoriaId } from "@cursos/api/dominio/tipos";
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

const { Categorias } = await import("./categorias");

const TAG = /<[^>]+>/g;
const texto = (html: string) =>
  html.replace(TAG, " ").replace(/\s+/g, " ").trim();
const LINHA = /<li[^>]*>.*?<\/li>/g;
const BOTAO = /<button[^>]*>.*?<\/button>/g;
const DESCRITO_POR = /aria-describedby="([^"]+)"/;

const EM_USO: CategoriaNaLista = {
  cursos: ["Autoavaliação Comercial", "Profills School Comercial"],
  id: "00000000-0000-4000-8000-000000000001" as CategoriaId,
  nome: "Vendas e negócios",
};
const LIVRE: CategoriaNaLista = {
  cursos: [],
  id: "00000000-0000-4000-8000-000000000002" as CategoriaId,
  nome: "Rotinas internas",
};

const tela = renderToStaticMarkup(<Categorias categorias={[LIVRE, EM_USO]} />);
const [linhaLivre = "", linhaEmUso = ""] = tela.match(LINHA) ?? [];

const apagarDe = (linha: string) =>
  (linha.match(BOTAO) ?? []).find((b) => texto(b) === "Apagar") ?? "";

function descricaoDe(botao: string) {
  const alvo = DESCRITO_POR.exec(botao)?.[1];
  const elemento = alvo
    ? new RegExp(`<[^>]*id="${alvo}"[^>]*>(.*?)</`).exec(tela)?.[1]
    : undefined;
  return elemento ? texto(elemento) : null;
}

describe("tela de categorias", () => {
  test("a lista mostra cada categoria na ordem que o servidor mandou", () => {
    expect(texto(tela)).toContain(
      "Todas Em ordem alfabética Rotinas internas Nenhum curso"
    );
    expect(tela.match(LINHA)).toHaveLength(2);
  });

  test("a categoria em uso mostra quantos cursos e quais", () => {
    expect(texto(linhaEmUso)).toStartWith(
      "Vendas e negócios 2 cursos Autoavaliação Comercial, Profills School Comercial"
    );
  });

  test("na categoria em uso, Apagar fica desligado e diz o motivo", () => {
    const apagar = apagarDe(linhaEmUso);
    expect(apagar).toContain('aria-disabled="true"');
    expect(apagar).toContain("data-disabled");
    expect(apagar).toContain('aria-label="Apagar Vendas e negócios"');
    expect(descricaoDe(apagar)).toBe(
      "Esta categoria está em 2 cursos. Troque a categoria deles antes de apagar."
    );
  });

  test("a categoria livre diz onde se escolhe, e Apagar abre a confirmação", () => {
    expect(texto(linhaLivre)).toStartWith(
      "Rotinas internas Nenhum curso Escolha esta categoria no editor de um curso."
    );
    const apagar = apagarDe(linhaLivre);
    expect(apagar).toContain('aria-label="Apagar Rotinas internas"');
    expect(apagar).not.toContain("aria-disabled");
    expect(apagar).not.toContain("data-disabled");
  });

  test("as duas linhas renomeiam", () => {
    for (const [linha, nome] of [
      [linhaLivre, "Rotinas internas"],
      [linhaEmUso, "Vendas e negócios"],
    ] as const) {
      expect(linha).toContain(`aria-label="Renomear ${nome}"`);
    }
  });

  test("o campo de criar fica no topo, antes da lista", () => {
    const campo = tela.indexOf('placeholder="Nome da nova categoria"');
    expect(campo).toBeGreaterThan(-1);
    expect(campo).toBeLessThan(tela.indexOf("Todas"));
    expect(texto(tela)).toStartWith("Criar categoria");
  });

  test("sem categoria, a lista diz onde a primeira vai aparecer", () => {
    const vazia = texto(renderToStaticMarkup(<Categorias categorias={[]} />));
    expect(vazia).toContain(
      "Nenhuma categoria ainda. A que você criar aparece no editor do curso."
    );
  });
});
