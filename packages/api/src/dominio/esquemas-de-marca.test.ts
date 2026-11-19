import { describe, expect, test } from "bun:test";

import { z } from "zod";

import { idDe, idMinusculoDe } from "./esquemas-de-marca";
import { cursoId, ehCursoId } from "./marcas";

const MAIUSCULO = "0A0B0C0D-0000-4000-8000-00000000000F";

const RECUSADOS: unknown[] = [
  "",
  "a b",
  ` ${MAIUSCULO}`,
  "abc",
  123,
  null,
  undefined,
];

const issues = (r: { error?: { issues: unknown[] } }) => r.error?.issues;

describe("idDe", () => {
  test("devolve o uuid como chegou, sem mudar a caixa", () => {
    expect(idDe(ehCursoId).parse(MAIUSCULO)).toBe(cursoId(MAIUSCULO));
  });

  test("recusa o que o z.uuid() recusa, com os mesmos issues", () => {
    for (const valor of RECUSADOS) {
      expect(issues(idDe(ehCursoId).safeParse(valor))).toEqual(
        issues(z.uuid().safeParse(valor))
      );
    }
  });

  test("com nullable, o null passa e o resto recusa como o z.uuid().nullable()", () => {
    const marcado = idDe(ehCursoId).nullable();

    expect(marcado.parse(null)).toBeNull();

    for (const valor of RECUSADOS.filter((v) => v !== null)) {
      expect(issues(marcado.safeParse(valor))).toEqual(
        issues(z.uuid().nullable().safeParse(valor))
      );
    }
  });
});

describe("idMinusculoDe", () => {
  test("o uuid maiúsculo entra e sai em minúscula", () => {
    expect(idMinusculoDe(ehCursoId).parse(MAIUSCULO)).toBe(
      cursoId(MAIUSCULO.toLowerCase())
    );
  });

  test("recusa o que o z.uuid() com toLowerCase recusa, com os mesmos issues", () => {
    const deHoje = z.uuid().transform((s) => s.toLowerCase());

    for (const valor of RECUSADOS) {
      expect(issues(idMinusculoDe(ehCursoId).safeParse(valor))).toEqual(
        issues(deHoje.safeParse(valor))
      );
    }
  });
});
