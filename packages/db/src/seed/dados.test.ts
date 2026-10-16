import { describe, expect, test } from "bun:test";

import { CODIGO_DO_CERTIFICADO } from "../schema/formatos";
import { codigoCertificado } from "./dados";

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
