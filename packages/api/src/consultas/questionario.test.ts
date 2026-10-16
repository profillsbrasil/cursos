import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const SRC = join(import.meta.dir, "..");
const INSERT_NO_QUESTIONARIO =
  /\binsert\(\s*questionario(?:Tentativa|Resposta)\s*\)/;

describe("responder", () => {
  test("é o único insert em questionario_tentativa e questionario_resposta do código do app", () => {
    const comInsert = [...new Glob("**/*.ts").scanSync(SRC)]
      .filter((arquivo) => !arquivo.endsWith(".test.ts"))
      .filter((arquivo) =>
        INSERT_NO_QUESTIONARIO.test(readFileSync(join(SRC, arquivo), "utf8"))
      )
      .sort();
    expect(comInsert).toEqual(["consultas/questionario.ts"]);
  });
});
