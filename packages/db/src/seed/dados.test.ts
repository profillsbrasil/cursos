import { describe, expect, test } from "bun:test";

import { CODIGO_DO_CERTIFICADO } from "../schema/formatos";
import { CURSOS, codigoCertificado } from "./dados";

const FORMATO = new RegExp(CODIGO_DO_CERTIFICADO);

describe("codigoCertificado", () => {
  test("dois alunos de exemplo recebem códigos diferentes", () => {
    expect(codigoCertificado("user_seedA")).not.toBe(
      codigoCertificado("user_3KKZ9kqaJkEYGzVNbHNZdHSepd3")
    );
  });

  test("o mesmo aluno recebe o mesmo código em toda execução", () => {
    expect(codigoCertificado("user_seedA")).toBe(
      codigoCertificado("user_seedA")
    );
  });

  test("o código sai no formato que o servidor emite e a conferência pública lê", () => {
    expect(codigoCertificado("user_seedA")).toMatch(FORMATO);
  });
});

describe("as categorias do seed", () => {
  test("nenhuma categoria tem o nome de um curso", () => {
    const titulos = new Set(CURSOS.map((c) => c.titulo));
    expect(
      CURSOS.filter((c) => titulos.has(c.categoria)).map((c) => [
        c.titulo,
        c.categoria,
      ])
    ).toEqual([]);
  });
});

describe("os cursos do seed", () => {
  test("todo curso publicado tem preço de troca, como o salvarCurso exige", () => {
    expect(
      CURSOS.filter(
        (c) => c.status === "publicado" && c.precoTroca === undefined
      ).map((c) => c.titulo)
    ).toEqual([]);
  });
});
