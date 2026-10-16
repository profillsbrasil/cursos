import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const SRC = join(import.meta.dir, "..");

describe("toda barra de progresso tem a borda do trilho", () => {
  test("o trilho com overflow-hidden leva o anel muted-foreground", () => {
    const semAnel = [...new Glob("**/*.tsx").scanSync(SRC)].flatMap((a) =>
      readFileSync(join(SRC, a), "utf8")
        .split("\n")
        .flatMap((linha, i) =>
          linha.includes("bg-trilho") &&
          linha.includes("overflow-hidden") &&
          !linha.includes("ring-muted-foreground")
            ? [`${a}:${i + 1}`]
            : []
        )
    );
    expect(semAnel).toEqual([]);
  });
});
