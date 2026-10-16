import { describe, expect, test } from "bun:test";
import { SLUG } from "@cursos/db/schema/formatos";

import { raizDoSlug, slugDoTitulo, slugLivre } from "./endereco";

describe("slugDoTitulo", () => {
  test("minúsculas e hífen no lugar de espaço", () => {
    expect(slugDoTitulo("Profills School Comercial")).toBe(
      "profills-school-comercial"
    );
  });

  test("tira acento e troca pontuação por hífen, sem hífen nas pontas", () => {
    expect(slugDoTitulo("  Operação da Envasadora: Nível 2 (NR-12)! ")).toBe(
      "operacao-da-envasadora-nivel-2-nr-12"
    );
  });

  test("título sem letra nem algarismo vira curso", () => {
    expect(slugDoTitulo("¿¡ — !?")).toBe("curso");
  });

  test("título longo corta em 72 caracteres, sem hífen no fim, e casa com o formato", () => {
    const slug = slugDoTitulo(`${"palavra ".repeat(9)}x`);
    expect(slug).toBe(
      "palavra-palavra-palavra-palavra-palavra-palavra-palavra-palavra-palavra"
    );
    expect(new RegExp(SLUG).test(slug)).toBe(true);
  });
});

describe("slugLivre", () => {
  test("a base livre fica como está", () => {
    expect(slugLivre("comercial", new Set(["outro"]))).toBe("comercial");
  });

  test("a base ocupada ganha o menor sufixo livre a partir de -2", () => {
    expect(
      slugLivre(
        "comercial",
        new Set(["comercial", "comercial-2", "comercial-4"])
      )
    ).toBe("comercial-3");
  });
});

describe("raizDoSlug", () => {
  test("a base e os slugs que ela pode virar têm a mesma raiz", () => {
    expect(
      ["envase", "envase-2", "envase-2-3", "nr-12-2"].map(raizDoSlug)
    ).toEqual(["envase", "envase", "envase", "nr"]);
  });

  test("slug só de algarismos é a própria raiz", () => {
    expect(raizDoSlug("2026")).toBe("2026");
  });
});
