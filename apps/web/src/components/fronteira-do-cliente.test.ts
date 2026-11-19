import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Glob } from "bun";

const SRC = join(import.meta.dir, "..");
const CONSTANTE = /^export const [A-Z][A-Z0-9_]* /m;

describe("módulo use client não exporta constante", () => {
  test("nenhum arquivo com use client exporta constante em maiúsculas", () => {
    const fora = [...new Glob("**/*.{ts,tsx}").scanSync(SRC)].filter(
      (arquivo) => {
        const texto = readFileSync(join(SRC, arquivo), "utf8");

        return texto.startsWith('"use client"') && CONSTANTE.test(texto);
      }
    );

    expect(fora).toEqual([]);
  });
});
