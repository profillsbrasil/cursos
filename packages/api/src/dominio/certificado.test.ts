import { describe, expect, test } from "bun:test";

import {
  ALFABETO_DO_CODIGO,
  codigoDosIndices,
} from "@cursos/db/schema/formatos";

import { codigoDigitado, FORMATO_DO_CODIGO, gerarCodigo } from "./certificado";

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

describe("codigoDigitado", () => {
  test.each([
    "7K3M-Q9TD",
    "7k3m-q9td",
    "7K3MQ9TD",
    "7k3mq9td",
    " 7K3M Q9TD ",
    " 7k3m q9td ",
    "7K3M – Q9TD",
  ])("lê %p como 7K3M-Q9TD", (texto) => {
    expect(String(codigoDigitado(texto))).toBe("7K3M-Q9TD");
  });

  test.each([
    "",
    "7K3M-Q9T",
    "7K3M-Q9TDX",
    "7K3M-Q9TD2",
    "7K3M-Q9T0",
    "7K3M-Q9TO",
    "7K3M-Q9T1",
    "7K3M-Q9TI",
    "7K3M-Q9TL",
    "7K3M/Q9TD",
    "PS-M0-2026-A1B2C3",
  ])("recusa %p", (texto) => {
    expect(codigoDigitado(texto)).toBeNull();
  });
});
