import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const SCHEMA = await readFile(join(import.meta.dir, "../.env.schema"), "utf8");

/** Os decoradores da linha de comentário logo acima da chave. */
function decoradores(chave: string) {
  const linhas = SCHEMA.split("\n");
  const i = linhas.findIndex((l) => l.startsWith(`${chave}=`));
  return i > 0 ? (linhas[i - 1] ?? "") : "";
}

describe(".env.schema", () => {
  // O varlock derruba o request que escreve no HTML o valor de um item sensível.
  // A origem do app vai ao HTML (link de conferência do certificado, QR), então
  // ela não pode ser sensível.
  test("CORS_ORIGIN é @public", () => {
    expect(decoradores("CORS_ORIGIN")).toContain("@public");
  });
});
