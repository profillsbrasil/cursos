import { describe, expect, test } from "bun:test";

import { niveis } from "./curso";
import { cursoCat, idAula } from "./exemplo";
import type { AulaId } from "./tipos";

const todas = (chave: string, aulas: number[]) =>
  aulas.flatMap((qtd, m) =>
    Array.from({ length: qtd }, (_, p) => idAula(chave, m, p + 1))
  );

describe("niveis", () => {
  const comNiveis = cursoCat("n", {
    aulas: [2, 2, 1],
    niveis: [
      { nome: "Primeiro", ordem: 1 },
      { nome: "Segundo", ordem: 2 },
      { nome: "Vazio", ordem: 3 },
    ],
    nivelPorModulo: [1, 1, 2],
  });

  test("nível obtido exige todas as aulas dos módulos daquele nível", () => {
    const quase = new Set([
      idAula("n", 0, 1),
      idAula("n", 0, 2),
      idAula("n", 1, 1),
    ] as AulaId[]);
    expect(niveis(comNiveis, quase).faixas[0]).toMatchObject({
      feitas: 3,
      obtido: false,
      total: 4,
    });
    const completo = new Set([...quase, idAula("n", 1, 2)] as AulaId[]);
    expect(niveis(comNiveis, completo).faixas[0]?.obtido).toBe(true);
  });

  test("nível sem aulas nunca está obtido", () => {
    const tudo = new Set(todas("n", [2, 2, 1]) as AulaId[]);
    expect(niveis(comNiveis, tudo).faixas[2]).toMatchObject({
      nome: "Vazio",
      obtido: false,
      total: 0,
    });
  });

  test("próximo nível é o primeiro não obtido e é null com todos obtidos", () => {
    expect(niveis(comNiveis, new Set()).proximo?.nome).toBe("Primeiro");
    const semVazio = cursoCat("s", {
      aulas: [1, 1],
      niveis: [
        { nome: "Um", ordem: 1 },
        { nome: "Dois", ordem: 2 },
      ],
      nivelPorModulo: [1, 2],
    });
    const tudo = new Set(todas("s", [1, 1]) as AulaId[]);
    expect(niveis(semVazio, tudo).proximo).toBeNull();
  });

  test("próximo nível pula nível sem aulas", () => {
    const meio = cursoCat("v", {
      aulas: [1, 1],
      niveis: [
        { nome: "A", ordem: 1 },
        { nome: "B", ordem: 2 },
        { nome: "C", ordem: 3 },
      ],
      nivelPorModulo: [1, 3],
    });
    const soA = new Set([idAula("v", 0, 1)] as AulaId[]);
    expect(niveis(meio, soA).proximo?.nome).toBe("C");
    const tudo = new Set(todas("v", [1, 1]) as AulaId[]);
    expect(niveis(meio, tudo).proximo).toBeNull();
  });
});
