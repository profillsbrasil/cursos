import { describe, expect, test } from "bun:test";
import type { CursoId, TrilhaId } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

import { VisaoDoCatalogo } from "./visao-do-catalogo";

const TAG = /<[^>]+>/g;
const SELO_EM_PRODUCAO =
  /<span class="([^"]*)"><svg[^>]*lucide-clock[^>]*>.*?<\/svg>Em produção<\/span>/;
const texto = (html: string) => html.replace(TAG, " ").replace(/\s+/g, " ");

const TRILHA = "t1" as TrilhaId;

describe("visão do catálogo", () => {
  test("mostra trilha e posição, curso solto, status e preço de troca", () => {
    const t = texto(
      renderToStaticMarkup(
        <VisaoDoCatalogo
          visao={{
            cursos: [
              {
                aulas: 12,
                id: "c1" as CursoId,
                precoTroca: null,
                status: "publicado",
                titulo: "Operação da envasadora",
                trilha: { id: TRILHA, posicao: 2, titulo: "Operador" },
              },
              {
                aulas: 0,
                id: "c2" as CursoId,
                precoTroca: 1500,
                status: "em_producao",
                titulo: "Vendas consultivas",
                trilha: null,
              },
            ],
            trilhas: [{ alunos: 3, cursos: 4, id: TRILHA, titulo: "Operador" }],
          }}
        />
      )
    );
    expect(t).toContain(
      "Operação da envasadora Publicado Operador · 2º 12 Sem troca"
    );
    expect(t).toContain("Vendas consultivas Em produção Solto 0 1.500 pts");
    expect(t).toContain("Operador 4 3");
    expect(t).toContain("2 cursos, 1 publicado");
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
              trilha: null,
            },
          ],
          trilhas: [],
        }}
      />
    );
    expect(html).toContain(
      'href="/admin/catalogo/cursos/c1">Operação da envasadora</a>'
    );
    expect(html).toContain('href="/admin/catalogo/cursos/novo"');
  });

  test("catálogo vazio diz que não há trilha nem curso", () => {
    const t = texto(
      renderToStaticMarkup(
        <VisaoDoCatalogo visao={{ cursos: [], trilhas: [] }} />
      )
    );
    expect(t).toContain("Nenhuma trilha no catálogo.");
    expect(t).toContain("Nenhum curso no catálogo.");
  });

  test("cada trilha leva ao editor dela, e Nova trilha aparece com ou sem trilhas", () => {
    const html = (trilhas: number) =>
      renderToStaticMarkup(
        <VisaoDoCatalogo
          visao={{
            cursos: [],
            trilhas: Array.from({ length: trilhas }, () => ({
              alunos: 0,
              cursos: 0,
              id: TRILHA,
              titulo: "Operador",
            })),
          }}
        />
      );
    expect(html(1)).toContain('href="/admin/catalogo/trilhas/t1">Operador</a>');
    for (const n of [0, 1]) {
      expect(html(n)).toContain('href="/admin/catalogo/trilhas/novo"');
    }
  });

  const comUmDeCada = () =>
    renderToStaticMarkup(
      <VisaoDoCatalogo
        visao={{
          cursos: [
            {
              aulas: 0,
              id: "c2" as CursoId,
              precoTroca: null,
              status: "em_producao",
              titulo: "Vendas consultivas",
              trilha: null,
            },
          ],
          trilhas: [{ alunos: 0, cursos: 1, id: TRILHA, titulo: "Operador" }],
        }}
      />
    );

  test("trilha e curso são o mesmo link: sublinhado em repouso, a decoração clareia sob o cursor e com o foco", () => {
    const classes = (titulo: string) =>
      new RegExp(`class="([^"]*)"[^>]*>${titulo}</a>`)
        .exec(comUmDeCada())?.[1]
        .split(" ");
    const trilha = classes("Operador");
    const curso = classes("Vendas consultivas");
    expect(trilha).toEqual(curso);
    expect(curso).toEqual(
      expect.arrayContaining([
        "underline",
        "decoration-muted-foreground",
        "underline-offset-4",
        "hover:decoration-titulo",
      ])
    );
  });

  test("Em produção é o selo do resto do admin, em contorno Céu com o relógio", () => {
    const selo = SELO_EM_PRODUCAO.exec(comUmDeCada())?.[1];
    expect(selo).toContain("text-ceu");
    expect(selo).toContain("ring-ceu");
  });
});
