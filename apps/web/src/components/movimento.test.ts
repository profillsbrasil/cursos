import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const SRC = join(import.meta.dir, "..");
// A curva de cada transição é o ease-forte, que o index.css põe como padrão do
// Tailwind: as palavras do Tailwind (ease-out, ease-in-out) e o cubic-bezier
// escrito à mão trocam a curva.
const CURVA_PROPRIA = /ease-\[cubic-bezier|\bease-(?:in|out|in-out|linear)\b/;
const DURACAO = /duration-(\d+)\b/g;
const DURACAO_MAXIMA_MS = 200;
const DESLIGA_NO_REDUZIDO = /motion-reduce:\S*(transition-none|animate-none)/;
const DESLOCA =
  /transition-transform|transition-\[[^\]]*(translate|transform|rotate|scale)|animate-spin/;

/**
 * A regra de movimento do DESIGN.md: a curva é o ease-forte e a transição da
 * interface dura de 150 a 200 ms. Curva escrita à mão ou duração acima disso
 * volta a ser acusada aqui, com o arquivo e a linha.
 */
describe("movimento da interface", () => {
  test("nenhum componente escreve curva própria nem passa de 200 ms", () => {
    const fora: string[] = [];
    for (const arquivo of new Glob("**/*.{ts,tsx}").scanSync(SRC)) {
      if (arquivo.includes(".test.")) {
        continue;
      }
      const linhas = readFileSync(join(SRC, arquivo), "utf8").split("\n");
      linhas.forEach((linha, i) => {
        const longas = [...linha.matchAll(DURACAO)].filter(
          (m) => Number(m[1]) > DURACAO_MAXIMA_MS
        );
        if (CURVA_PROPRIA.test(linha) || longas.length > 0) {
          fora.push(`${arquivo}:${i + 1}`);
        }
      });
    }
    expect(fora).toEqual([]);
  });

  // Com movimento reduzido, sai o deslocamento e ficam a cor e a opacidade
  // (skill review-animations): desligar a transição só vale onde algo se move.
  test("o movimento reduzido só desliga o que desloca", () => {
    const fora: string[] = [];
    for (const arquivo of new Glob("**/*.{ts,tsx}").scanSync(SRC)) {
      if (arquivo.includes(".test.")) {
        continue;
      }
      const linhas = readFileSync(join(SRC, arquivo), "utf8").split("\n");
      linhas.forEach((linha, i) => {
        if (DESLIGA_NO_REDUZIDO.test(linha) && !DESLOCA.test(linha)) {
          fora.push(`${arquivo}:${i + 1}`);
        }
      });
    }
    expect(fora).toEqual([]);
  });
});
