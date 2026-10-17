import { describe, expect, test } from "bun:test";

import {
  colunasDosCertificados,
  cssDoPonto,
  naPontaEsquerda,
  pontoNaTrilha,
} from "./geometria";

const METAS = [10, 50, 100] as const;

describe("o ponto da trilha de aulas", () => {
  const ponto = (feitas: number) => {
    const p = pontoNaTrilha(feitas, METAS);
    return [Number(p.porcento.toFixed(4)), Number(p.recuoPx.toFixed(4))];
  };

  test("sem aula, na borda esquerda", () => {
    expect(ponto(0)).toEqual([0, 0]);
  });

  test("no primeiro trecho, o recuo cresce até meia medalha", () => {
    expect(ponto(5)).toEqual([16.6667, 14]);
  });

  test("na meta, no centro da medalha", () => {
    expect(ponto(10)).toEqual([33.3333, 28]);
    expect(ponto(50)).toEqual([66.6667, 28]);
    expect(ponto(100)).toEqual([100, 28]);
  });

  test("entre duas medalhas, em linha reta", () => {
    expect(ponto(49)).toEqual([65.8333, 28]);
    expect(ponto(75)).toEqual([83.3333, 28]);
  });

  test("depois da última meta, para na última medalha", () => {
    expect(ponto(140)).toEqual([100, 28]);
  });

  test("vira o calc do CSS", () => {
    expect(cssDoPonto({ porcento: 50, recuoPx: 28 })).toBe("calc(50% - 28px)");
  });
});

describe("as colunas dos certificados", () => {
  test("até 4 cursos, uma por curso; acima, nenhum cartão sozinho na última linha", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 13].map(colunasDosCertificados)).toEqual(
      [1, 2, 3, 4, 3, 4, 4, 4, 3, 3]
    );
  });
});

describe("a pílula na ponta esquerda", () => {
  test("com 0 e 1 aula, alinha pelo começo; com 2, já centra no ponto", () => {
    expect(
      [0, 1, 2, 49].map((n) => naPontaEsquerda(pontoNaTrilha(n, METAS)))
    ).toEqual([true, true, false, false]);
  });
});
