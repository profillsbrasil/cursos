import { describe, expect, test } from "bun:test";

import { CERTIFICADO_A, CURSOS, codigoCertificado } from "./dados";

const FORMATO = /^PS-M0-2026-[0-9A-F]{6}$/;

describe("codigoCertificado", () => {
  test("dois alunos de exemplo recebem códigos diferentes", () => {
    const a = codigoCertificado(CERTIFICADO_A.prefixo, "user_seedA");
    const b = codigoCertificado(
      CERTIFICADO_A.prefixo,
      "user_3KKZ9kqaJkEYGzVNbHNZdHSepd3"
    );
    expect(a).not.toBe(b);
  });

  test("o mesmo aluno recebe o mesmo código em toda execução", () => {
    expect(codigoCertificado(CERTIFICADO_A.prefixo, "user_seedA")).toBe(
      codigoCertificado(CERTIFICADO_A.prefixo, "user_seedA")
    );
  });

  test("o código mantém o prefixo do protótipo", () => {
    expect(codigoCertificado(CERTIFICADO_A.prefixo, "user_seedA")).toMatch(
      FORMATO
    );
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
