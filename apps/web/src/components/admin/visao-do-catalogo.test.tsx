import { describe, expect, test } from "bun:test";
import type { CursoId } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

import { VisaoDoCatalogo } from "./visao-do-catalogo";

const TAG = /<[^>]+>/g;
const CABECALHO = /<th[\s>]/g;
const LINK_DO_CURSO = /class="([^"]*)"[^>]*>Vendas consultivas<\/a>/;
const SELO_EM_PRODUCAO =
  /<span class="([^"]*)"><svg[^>]*lucide-clock[^>]*>.*?<\/svg>Em produção<\/span>/;
const texto = (html: string) => html.replace(TAG, " ").replace(/\s+/g, " ");

const EM_PRODUCAO = {
  aulas: 0,
  id: "c2" as CursoId,
  precoTroca: 1500,
  status: "em_producao",
  titulo: "Vendas consultivas",
} as const;

describe("visão do catálogo", () => {
  test("mostra cada curso com status, aulas e preço de troca, e nenhuma coluna a mais", () => {
    const html = renderToStaticMarkup(
      <VisaoDoCatalogo
        visao={{
          cursos: [
            {
              aulas: 12,
              id: "c1" as CursoId,
              precoTroca: null,
              status: "publicado",
              titulo: "Operação da envasadora",
            },
            EM_PRODUCAO,
          ],
        }}
      />
    );
    const t = texto(html);
    expect(t).toContain("Operação da envasadora Publicado 12 Sem troca");
    expect(t).toContain("Vendas consultivas Em produção 0 1.500 pts");
    expect(t).toContain("2 cursos, 1 publicado");
    expect(html.match(CABECALHO)).toHaveLength(4);
  });

  test("cada curso abre o editor, e o Novo curso abre um rascunho", () => {
    const html = renderToStaticMarkup(
      <VisaoDoCatalogo
        visao={{
          cursos: [
            {
              aulas: 1,
              id: "c1" as CursoId,
              precoTroca: null,
              status: "publicado",
              titulo: "Operação da envasadora",
            },
          ],
        }}
      />
    );
    expect(html).toContain(
      'href="/admin/catalogo/cursos/c1">Operação da envasadora</a>'
    );
    expect(html).toContain('href="/admin/catalogo/cursos/novo"');
  });

  test("catálogo vazio diz que não há curso e ainda oferece o Novo curso", () => {
    const html = renderToStaticMarkup(
      <VisaoDoCatalogo visao={{ cursos: [] }} />
    );
    expect(texto(html)).toContain("Nenhum curso no catálogo.");
    expect(html).toContain('href="/admin/catalogo/cursos/novo"');
  });

  const comUm = () =>
    renderToStaticMarkup(<VisaoDoCatalogo visao={{ cursos: [EM_PRODUCAO] }} />);

  test("o link do curso é sublinhado em repouso, e a decoração clareia sob o cursor e com o foco", () => {
    const curso = LINK_DO_CURSO.exec(comUm())?.[1].split(" ");
    expect(curso).toEqual(
      expect.arrayContaining([
        "underline",
        "decoration-muted-foreground",
        "underline-offset-4",
        "hover:decoration-titulo",
        "transition-colors",
      ])
    );
  });

  test("Em produção é o selo do resto do admin, em contorno Céu com o relógio", () => {
    const selo = SELO_EM_PRODUCAO.exec(comUm())?.[1];
    expect(selo).toContain("text-ceu");
    expect(selo).toContain("ring-ceu");
  });
});
