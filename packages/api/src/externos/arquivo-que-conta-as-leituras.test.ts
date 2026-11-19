import { describe, expect, test } from "bun:test";

import {
  ArquivoQueContaAsLeituras,
  NAO_LEEM_O_CONTEUDO,
} from "./arquivo-que-conta-as-leituras.test-utils";

const LER: Record<string, (arquivo: ArquivoQueContaAsLeituras) => unknown> = {
  arrayBuffer: (a) => a.arrayBuffer(),
  bytes: (a) => a.bytes(),
  formData: (a) => a.formData(),
  image: (a) => a.image(),
  json: (a) => a.json(),
  slice: (a) => a.slice(1),
  stream: (a) => a.stream(),
  text: (a) => a.text(),
};

describe("ArquivoQueContaAsLeituras", () => {
  test("conta todo método do Blob do Bun que lê o conteúdo", () => {
    const doBlob = new Set(
      [Blob.prototype, File.prototype].flatMap((p) =>
        Object.getOwnPropertyNames(p)
      )
    );

    expect(
      [...doBlob].filter((nome) => !NAO_LEEM_O_CONTEUDO.has(nome)).toSorted()
    ).toEqual(Object.keys(LER).toSorted());
  });

  test.each(Object.entries(LER))("%s conta uma leitura", async (_, ler) => {
    const arquivo = new ArquivoQueContaAsLeituras(["{}"], "a.json");

    await Promise.allSettled([Promise.resolve(arquivo).then(ler)]);

    expect(arquivo.lidos).toBe(1);
  });
});
