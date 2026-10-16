import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const SRC = join(import.meta.dir, "..");
const ESTE = "components/sem-migalha.test.ts";
const MIGALHA = /migalha|breadcrumb/i;

describe("nenhuma migalha no app", () => {
  test("nenhum arquivo de src fala em migalha ou breadcrumb", () => {
    const com = [...new Glob("**/*").scanSync(SRC)].filter(
      (arquivo) =>
        arquivo !== ESTE &&
        (MIGALHA.test(arquivo) ||
          MIGALHA.test(readFileSync(join(SRC, arquivo), "utf8")))
    );
    expect(com).toEqual([]);
  });
});
