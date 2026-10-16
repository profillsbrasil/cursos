import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const SRC = join(import.meta.dir, "..");

// O trilho (#4d5257) mede 1,5:1 contra o cartão, e nenhum cinza passa de 3:1
// contra o cartão sem cair abaixo de 3:1 contra o Sol do preenchimento (o melhor
// empata em 2,8:1). A barra fica com as duas bordas a 3:1 (PRODUCT.md, critério
// 1.4.11): o Sol contra o trilho por dentro, e o anel muted-foreground por fora.
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
