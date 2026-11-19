import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const SCHEMA = await readFile(join(import.meta.dir, "../.env.schema"), "utf8");

function decoradores(chave: string) {
  const linhas = SCHEMA.split("\n");
  const i = linhas.findIndex((l) => l.startsWith(`${chave}=`));

  return i > 0 ? (linhas[i - 1] ?? "") : "";
}

describe(".env.schema", () => {
  test("CORS_ORIGIN é @public: a origem do app vai ao HTML (link de conferência do certificado, QR) e o varlock derruba o request que escreve ali um valor sensível", () => {
    expect(decoradores("CORS_ORIGIN")).toContain("@public");
  });

  test.each(["S3_ENDPOINT", "S3_REGION", "S3_BUCKET"])(
    '%s não é sensível: o varlock acusa como vazado todo valor sensível que aparece no build, e a região do bucket é "auto", palavra que existe em qualquer JS',
    (chave) => {
      expect(decoradores(chave)).toContain("@sensitive=false");
    }
  );
});
