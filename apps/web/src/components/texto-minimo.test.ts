import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const SRC = join(import.meta.dir, "..");
const TEXTO_EM_PX = /text-\[(\d+(?:\.\d+)?)px\]/g;
const MENOR_LEGIVEL_PX = 11;

/** As exceções que o DESIGN.md escreve, cada uma no único arquivo dela. */
const ABAIXO_DE_11_PX: Record<string, string> = {
  "components/casca/cabecalho-da-casca.tsx": "o selo da área, 10 px",
  "components/player/controles-do-player.tsx":
    'o "10" de 7 px, parte do glifo de voltar 10 s',
};

/**
 * O princípio 4 do PRODUCT.md: ninguém deixa de enxergar um texto. Texto
 * abaixo de 11 px fora das exceções volta a ser acusado aqui, com o arquivo e
 * a linha.
 */
describe("tamanho mínimo do texto", () => {
  test("nenhum texto fica abaixo de 11 px fora das exceções do DESIGN.md", () => {
    const fora: string[] = [];
    for (const arquivo of new Glob("**/*.{ts,tsx}").scanSync(SRC)) {
      if (arquivo.includes(".test.") || arquivo in ABAIXO_DE_11_PX) {
        continue;
      }
      const linhas = readFileSync(join(SRC, arquivo), "utf8").split("\n");
      linhas.forEach((linha, i) => {
        const pequenos = [...linha.matchAll(TEXTO_EM_PX)].filter(
          (m) => Number(m[1]) < MENOR_LEGIVEL_PX
        );
        if (pequenos.length > 0) {
          fora.push(`${arquivo}:${i + 1}`);
        }
      });
    }
    expect(fora).toEqual([]);
  });
});
