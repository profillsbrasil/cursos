import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const SRC_DO_APP = join(import.meta.dir, "..");
const SRC_DA_UI = join(import.meta.dir, "../../../../packages/ui/src");
const ESTE = join(SRC_DO_APP, "components/sem-migalha.test.ts");
const MIGALHA = /migalha|breadcrumb/i;

const comMigalha = (src: string) =>
  [...new Glob("**/*").scanSync(src)].filter(
    (arquivo) =>
      join(src, arquivo) !== ESTE &&
      (MIGALHA.test(arquivo) ||
        MIGALHA.test(readFileSync(join(src, arquivo), "utf8")))
  );

describe("nenhuma migalha no app", () => {
  test("nenhum arquivo de src fala em migalha ou breadcrumb", () => {
    expect(comMigalha(SRC_DO_APP)).toEqual([]);
  });

  test("o packages/ui não tem o componente de breadcrumb", () => {
    expect(comMigalha(SRC_DA_UI)).toEqual([]);
  });
});
