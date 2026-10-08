import { describe, expect, test } from "bun:test";
import { CODIGO_DA_RECUSA } from "@cursos/api/dominio/troca";

import { MOSTRA_A_MENSAGEM } from "./use-acao";

describe("useAcao", () => {
  test("toda recusa da troca chega à pessoa com a mensagem do servidor", () => {
    const escondidos = Object.values(CODIGO_DA_RECUSA).filter(
      (codigo) => !MOSTRA_A_MENSAGEM.has(codigo)
    );
    expect(escondidos).toEqual([]);
  });

  test("BAD_REQUEST e INTERNAL_SERVER_ERROR nunca mostram o texto do servidor", () => {
    expect(
      ["BAD_REQUEST", "INTERNAL_SERVER_ERROR"].filter((c) =>
        MOSTRA_A_MENSAGEM.has(c)
      )
    ).toEqual([]);
  });
});
