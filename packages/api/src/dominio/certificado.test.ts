import { describe, expect, test } from "bun:test";

import { ALFABETO_DO_CODIGO } from "@cursos/db/schema/formatos";

import {
  codigoDosIndices,
  FORMATO_DO_CODIGO,
  gerarCodigo,
  normalizarCodigo,
} from "./certificado";

const CONFUNDIVEIS = /[01OIL]/;

describe("código do certificado", () => {
  test("8 índices viram XXXX-XXXX no alfabeto sem 0, O, 1, I e L", () => {
    expect(codigoDosIndices([5, 17, 1, 18, 21, 7, 24, 11])).toBe("7K3M-Q9TD");
    expect(ALFABETO_DO_CODIGO).not.toMatch(CONFUNDIVEIS);
  });

  test("índice fora do alfabeto e quantidade errada são defeito, não código", () => {
    expect(() => codigoDosIndices([0, 1, 2, 3, 4, 5, 6, 31])).toThrow(
      "fora do alfabeto"
    );
    expect(() => codigoDosIndices([0, 1, 2])).toThrow("8 símbolos");
  });

  test("o sorteado está no formato e muda a cada chamada", () => {
    const codigos = new Set(Array.from({ length: 20 }, gerarCodigo));
    for (const c of codigos) {
      expect(c).toMatch(FORMATO_DO_CODIGO);
    }
    expect(codigos.size).toBe(20);
  });
});

describe("normalizarCodigo", () => {
  test("ignora caixa, espaços e o hífen", () => {
    expect(normalizarCodigo(" 7k3m q9td ")).toBe("7K3M-Q9TD");
    expect(normalizarCodigo("7K3MQ9TD")).toBe("7K3M-Q9TD");
    expect(normalizarCodigo("7K3M-Q9TD")).toBe("7K3M-Q9TD");
  });

  test("null com símbolo fora do alfabeto ou tamanho errado", () => {
    expect(normalizarCodigo("7K3M-Q9TO")).toBeNull();
    expect(normalizarCodigo("7K3M-Q9T")).toBeNull();
    expect(normalizarCodigo("")).toBeNull();
    expect(normalizarCodigo("7K3M-Q9TD2")).toBeNull();
  });
});
