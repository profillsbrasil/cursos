import { describe, expect, test } from "bun:test";

import {
  montarConcessoes,
  recusaDaConcessao,
  rotuloDaConcessao,
} from "./concessao";

describe("recusaDaConcessao", () => {
  test("dar sempre cabe, e tirar cabe até o saldo", () => {
    expect(recusaDaConcessao(0, 3000)).toBeNull();
    expect(recusaDaConcessao(130, -130)).toBeNull();
  });

  test("tirar além do saldo diz quanto a pessoa tem", () => {
    expect(recusaDaConcessao(1250, -1251)).toBe(
      "A pessoa tem só 1.250 pontos."
    );
    expect(recusaDaConcessao(1, -2)).toBe("A pessoa tem só 1 ponto.");
    expect(recusaDaConcessao(0, -1)).toBe("A pessoa não tem pontos.");
  });
});

test("o rótulo do extrato separa dar de tirar", () => {
  expect(rotuloDaConcessao(3000)).toBe("Pontos do admin");
  expect(rotuloDaConcessao(-10)).toBe("Ajuste do admin");
});

test("montarConcessoes troca o autor pelo nome, e o desconhecido fica com o userId", () => {
  const em = new Date("2026-10-27T15:00:00Z");
  expect(
    montarConcessoes(
      [
        {
          concedidaEm: em,
          concedidaPor: "user_a",
          id: "1",
          motivo: "X",
          pontos: 10,
        },
        {
          concedidaEm: em,
          concedidaPor: "user_b",
          id: "2",
          motivo: "Y",
          pontos: -5,
        },
      ],
      [{ email: null, foto: null, nome: "Ana", userId: "user_a" }, null]
    )
  ).toEqual([
    { em, id: "1", motivo: "X", pontos: 10, por: "Ana" },
    { em, id: "2", motivo: "Y", pontos: -5, por: "user_b" },
  ]);
});
