import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const SRC = join(import.meta.dir, "../..");
const SELECT_DO_SISTEMA = /native-select|<select[\s>]/;

/**
 * A lista do <select> sai com as cores do sistema operacional. Toda escolha do
 * app passa pela Selecao, que desenha a lista no padrão do menu da conta.
 */
describe("o app não usa o select do sistema", () => {
  test("nenhum arquivo importa o NativeSelect nem escreve <select>", () => {
    const fora = [...new Glob("**/*.{ts,tsx}").scanSync(SRC)].filter(
      (arquivo) =>
        !arquivo.includes(".test.") &&
        SELECT_DO_SISTEMA.test(readFileSync(join(SRC, arquivo), "utf8"))
    );
    expect(fora).toEqual([]);
  });
});
