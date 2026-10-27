import { describe, expect, test } from "bun:test";
import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import type { AulaId } from "@cursos/api/dominio/tipos";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";
import { renderToStaticMarkup } from "react-dom/server";

import { ColunaDoCurso } from "./coluna-do-curso";

const AULA = "11111111-1111-4111-8111-111111111111" as AulaId;

const DADOS: AulaNoPlayer = {
  amostra: null,
  anterior: null,
  aula: {
    descricao: "",
    duracaoSeg: 300,
    id: AULA,
    modulo: { numero: 1, titulo: "Primeiros passos" },
    numeroNoModulo: 1,
    titulo: "Abertura",
    totalNoModulo: 1,
    video: null,
  },
  curso: {
    progresso: { feitas: 0, pct: 0, total: 1 },
    slug: "comercial",
    titulo: "Comercial",
  },
  estudo: { assistida: false, posicaoSeg: 0, trechos: SEM_TRECHOS },
  modulos: [
    {
      atual: true,
      aulas: [
        {
          assistida: false,
          atual: true,
          duracaoSeg: 300,
          id: AULA,
          questionario: { tipo: "sem" },
          titulo: "Abertura",
        },
      ],
      feitas: 0,
      numero: 1,
      titulo: "Primeiros passos",
    },
  ],
  proxima: null,
  questionario: null,
};

const LINK = /<a\b[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g;
const TITULO = /<h2\b[^>]*>(.*?)<\/h2>/;

describe("o título do curso na coluna leva à página do curso", () => {
  test("o título é o link, com o endereço da página do curso", () => {
    const html = renderToStaticMarkup(<ColunaDoCurso dados={DADOS} />);
    const titulo = html.match(TITULO)?.[1] ?? "";
    expect(
      [...titulo.matchAll(LINK)].map(([, href, texto]) => [href, texto])
    ).toEqual([["/cursos/comercial", "Comercial"]]);
  });
});
