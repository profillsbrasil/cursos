import { describe, expect, test } from "bun:test";

import { abrirOuRascunho } from "./abrir-ou-rascunho";

const GRAVADO = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const NOVO = "0A1B2C3D-4E5F-4061-8728-394A5B6C7D8E";

/** Um banco de um documento só, que anota cada leitura. */
function banco() {
  const lidos: string[] = [];
  return {
    fontes: {
      carregar: (id: string) => {
        lidos.push(id);
        return Promise.resolve(id === GRAVADO ? `gravado:${id}` : null);
      },
      rascunho: (id: string) => `rascunho:${id}`,
    },
    lidos,
  };
}

describe("abrirOuRascunho", () => {
  test("id que existe abre o banco, com ou sem ?novo=1", async () => {
    const { fontes } = banco();
    expect(await abrirOuRascunho({ id: GRAVADO, novo: "1" }, fontes)).toBe(
      `gravado:${GRAVADO}`
    );
    expect(
      await abrirOuRascunho({ id: GRAVADO, novo: undefined }, fontes)
    ).toBe(`gravado:${GRAVADO}`);
  });

  test("id que não existe vira rascunho só com ?novo=1, em minúscula", async () => {
    const { fontes } = banco();
    expect(await abrirOuRascunho({ id: NOVO, novo: "1" }, fontes)).toBe(
      `rascunho:${NOVO.toLowerCase()}`
    );
    expect(await abrirOuRascunho({ id: NOVO, novo: undefined }, fontes)).toBe(
      null
    );
    expect(await abrirOuRascunho({ id: NOVO, novo: ["1", "1"] }, fontes)).toBe(
      null
    );
  });

  test("id fora do formato do router é 404 e nem chega ao banco", async () => {
    const { fontes, lidos } = banco();
    const abertos = await Promise.all(
      [
        "nao-e-uuid",
        // Passa numa regex frouxa de hexadecimal, mas a versão 0 não é RFC.
        "6f1c2a3b-4d5e-0f60-8a7b-9c0d1e2f3a4b",
      ].map((id) => abrirOuRascunho({ id, novo: "1" }, fontes))
    );
    expect(abertos).toEqual([null, null]);
    expect(lidos).toEqual([]);
  });
});
