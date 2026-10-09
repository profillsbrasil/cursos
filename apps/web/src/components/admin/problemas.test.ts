import { describe, expect, test } from "bun:test";

import { errosPorCampo, fraseDeReserva, semRepetir } from "./problemas";

describe("problemas", () => {
  test("semRepetir guarda o primeiro problema de cada campo e cada frase uma vez", () => {
    expect(
      semRepetir([
        { campo: "a", mensagem: "primeira" },
        { campo: "a", mensagem: "segunda" },
        { campo: null, mensagem: "frase" },
        { campo: null, mensagem: "frase" },
        { campo: null, mensagem: "outra" },
      ])
    ).toEqual([
      { campo: "a", mensagem: "primeira" },
      { campo: null, mensagem: "frase" },
      { campo: null, mensagem: "outra" },
    ]);
  });

  test("errosPorCampo leva só os problemas com campo", () => {
    expect([
      ...errosPorCampo([
        { campo: "a", mensagem: "x" },
        { campo: null, mensagem: "y" },
      ]),
    ]).toEqual([["a", "x"]]);
  });

  test("a frase de reserva diz o caminho recusado, ou o documento", () => {
    expect(fraseDeReserva("A trilha", ["versao"])).toBe(
      "A trilha tem um valor que o servidor recusa (versao). Recarregue a página e tente de novo."
    );
    expect(fraseDeReserva("O curso", [])).toContain("(documento)");
  });
});
