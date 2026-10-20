import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

import { ROTULO } from "./casca/campos";
import { CARTAO } from "./casca/cartoes";
import { SELO } from "./casca/selos";

const SRC = join(import.meta.dir, "..");
const FUNDO_DO_CARTAO = /\sbg-card[\s/"]/;
const DEFINE_ROTULO = /export const ROTULO\b/;

function linhasQue(casa: (linha: string) => boolean, dono: string): string[] {
  return [...new Glob("**/*.{ts,tsx}").scanSync(SRC)]
    .filter((a) => !(a.includes(".test.") || a === dono))
    .flatMap((a) =>
      readFileSync(join(SRC, a), "utf8")
        .split("\n")
        .flatMap((linha, i) => (casa(linha) ? [`${a}:${i + 1}`] : []))
    );
}

const tem = (linha: string, ...classes: string[]) =>
  classes.every((c) =>
    new RegExp(`(^|[\\s"'\`])${escapar(c)}($|[\\s"'\`])`).test(linha)
  );

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("o cartão, o selo e o rótulo de campo moram num lugar só", () => {
  test("o cartão é o raio de 20 px sobre card com anel de 1 px em borda", () => {
    expect(CARTAO).toBe("rounded-[20px] bg-card ring-1 ring-border");
  });

  test("nenhum arquivo escreve o cartão à mão", () => {
    expect(
      linhasQue(
        (l) => tem(l, "rounded-[20px]", "ring-1") && FUNDO_DO_CARTAO.test(l),
        "components/casca/cartoes.ts"
      )
    ).toEqual([]);
  });

  test("o selo é a pílula de 24 px do Badge, com ícone de 12 px a 6 px do texto", () => {
    for (const classe of [
      "h-6",
      "rounded-full",
      "px-2.5",
      "text-xs",
      "gap-1.5",
    ]) {
      expect(SELO.split(" ")).toContain(classe);
    }
    expect(SELO).toContain("[&>svg]:size-3!");
  });

  test("nenhum arquivo escreve a pílula do selo à mão", () => {
    expect(
      linhasQue(
        (l) => tem(l, "h-6", "rounded-full", "px-2.5"),
        "components/casca/selos.ts"
      )
    ).toEqual([]);
  });

  test("o rótulo de campo é um só, em 600 e 14 px", () => {
    expect(ROTULO).toBe("font-semibold text-foreground text-sm");
    expect(
      linhasQue((l) => DEFINE_ROTULO.test(l), "components/casca/campos.ts")
    ).toEqual([]);
  });
});
