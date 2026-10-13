import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

import { PRODUTO } from "./marca";

const SRC = join(import.meta.dir, "..");
const NOME_ANTIGO = /\bSchool\b/;
const arquivos = () =>
  [...new Glob("**/*.{ts,tsx}").scanSync(SRC)].filter(
    (a) => !(a.endsWith(".test.ts") || a.endsWith(".test.tsx"))
  );

describe("nome do produto", () => {
  test("o literal do nome mora só em lib/marca.ts", () => {
    expect(PRODUTO).toBe("Profills Cursos");
    const fora = arquivos().filter(
      (a) =>
        a !== "lib/marca.ts" &&
        readFileSync(join(SRC, a), "utf8").includes(PRODUTO)
    );
    expect(fora).toEqual([]);
  });

  // "Profills <span>School</span>" escapava de uma busca pelo nome inteiro.
  test("o nome antigo não volta, nem quebrado em JSX", () => {
    const comSchool = arquivos().filter((a) =>
      NOME_ANTIGO.test(readFileSync(join(SRC, a), "utf8"))
    );
    expect(comSchool).toEqual([]);
  });
});
