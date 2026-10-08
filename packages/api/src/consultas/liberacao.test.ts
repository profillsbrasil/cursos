import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const SRC = join(import.meta.dir, "..");
const INSERT_EM_LIBERACAO = /\binsert\(\s*liberacao\s*\)/;

describe("inserirLiberacao", () => {
  test("é o único insert(liberacao) do código do app", () => {
    const comInsert = [...new Glob("**/*.ts").scanSync(SRC)]
      .filter((arquivo) => !arquivo.endsWith(".test.ts"))
      .filter((arquivo) =>
        INSERT_EM_LIBERACAO.test(readFileSync(join(SRC, arquivo), "utf8"))
      )
      .sort();
    expect(comInsert).toEqual(["consultas/liberacao.ts"]);
  });
});
