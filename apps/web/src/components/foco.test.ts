import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Glob } from "bun";

const SRC = join(import.meta.dir, "..");

const CSS = {
  "apps/web/src/index.css": join(SRC, "index.css"),
  "packages/ui/src/styles/globals.css": join(
    SRC,
    "../../../packages/ui/src/styles/globals.css"
  ),
};

const PROIBIDO =
  /focus-visible|focus-within|(?:^|[\s"'`:])[\w-]*focus(?:\/[\w-]+)?:(?=[\w[&*!-])(?!bg-|text-)|(?:^|[\s"'`:])-?outline-[\w[]|ring-(?:ring|sidebar-ring|offset)/;

const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const DECLARACAO_DE_CONTORNO =
  /(?:^|[;{\s])(outline(?:-[a-z]+)?)\s*:\s*([^;}]+)/g;

describe("o foco não desenha contorno nem anel", () => {
  test("nenhuma classe do app escreve estado de foco além do destaque de menu", () => {
    const achados = [...new Glob("**/*.{ts,tsx}").scanSync(SRC)]
      .filter((arquivo) => !arquivo.includes(".test."))
      .flatMap((arquivo) =>
        readFileSync(join(SRC, arquivo), "utf8")
          .split("\n")
          .flatMap((linha, i) =>
            PROIBIDO.test(linha) ? [`${arquivo}:${i + 1}`] : []
          )
      );

    expect(achados).toEqual([]);
  });

  test("o index.css apaga o contorno de todo foco de teclado", () => {
    const css = semComentarios(
      readFileSync(CSS["apps/web/src/index.css"], "utf8")
    );

    expect(css.replace(/\s+/g, " ")).toContain(
      ":focus-visible { outline: none; }"
    );
  });

  test("por decisão do dono, nenhum CSS do app desenha contorno, nem em forced-colors", () => {
    for (const [nome, caminho] of Object.entries(CSS)) {
      const css = semComentarios(readFileSync(caminho, "utf8"));

      const contornos = css
        .matchAll(DECLARACAO_DE_CONTORNO)
        .map((m) => `${nome}: ${m[1]}: ${(m[2] ?? "").trim()}`)
        .filter((d) => !d.endsWith("outline: none"))
        .toArray();

      expect(contornos).toEqual([]);
      expect(css).not.toContain("forced-colors");
    }
  });
});
