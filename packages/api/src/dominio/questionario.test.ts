import { describe, expect, test } from "bun:test";

import {
  acertosParaPassar,
  corrigir,
  letraDa,
  marcaDoQuestionario,
  montarQuestionarioDaAula,
  type PerguntaComGabarito,
  pontosDaTentativa,
  resultadoDaTentativa,
  type TentativaGravada,
} from "./questionario";
import type { AlternativaId, PerguntaId } from "./tipos";

test("70% arredonda para cima: 3 de 3, 3 de 4, 4 de 5, 7 de 10", () => {
  expect([1, 2, 3, 4, 5, 6, 7, 10, 20].map(acertosParaPassar)).toEqual([
    1, 2, 3, 3, 4, 5, 5, 7, 14,
  ]);
});

test("as cinco letras pela posição", () => {
  expect([0, 1, 4].map(letraDa)).toEqual(["A", "B", "E"]);
});

const P = (n: number) => `p${n}` as PerguntaId;
const A = (n: number) => `a${n}` as AlternativaId;

/** Três perguntas de duas alternativas; a certa é a segunda (a2, a4, a6). */
const PERGUNTAS: PerguntaComGabarito[] = [1, 2, 3].map((n) => ({
  alternativas: [
    { id: A(n * 2 - 1), texto: "Errada" },
    { id: A(n * 2), texto: "Certa" },
  ],
  certa: A(n * 2),
  enunciado: `Pergunta ${n}`,
  id: P(n),
}));

const responder = (...alternativas: number[]) =>
  alternativas.map((a, i) => ({ alternativaId: A(a), perguntaId: P(i + 1) }));

describe("corrigir", () => {
  test("3 de 3 aprova; 2 de 3 não, porque 70% de 3 pede 3", () => {
    expect(corrigir(PERGUNTAS, responder(2, 4, 6))).toEqual({
      acertos: 3,
      aprovada: true,
      respostas: [
        { alternativaId: A(2), certa: true, perguntaId: P(1) },
        { alternativaId: A(4), certa: true, perguntaId: P(2) },
        { alternativaId: A(6), certa: true, perguntaId: P(3) },
      ],
      tipo: "corrigida",
      total: 3,
    });
    expect(corrigir(PERGUNTAS, responder(2, 3, 6))).toMatchObject({
      acertos: 2,
      aprovada: false,
      tipo: "corrigida",
    });
  });

  test("pergunta sem resposta, ou com alternativa de outra pergunta, deixa o envio incompleto", () => {
    expect(corrigir(PERGUNTAS, responder(2, 4))).toEqual({
      faltam: 1,
      tipo: "incompleta",
    });
    expect(corrigir(PERGUNTAS, responder(2, 4, 2))).toEqual({
      faltam: 1,
      tipo: "incompleta",
    });
    expect(
      corrigir(PERGUNTAS, [
        ...responder(2, 4, 6),
        { alternativaId: A(1), perguntaId: "fantasma" as PerguntaId },
      ])
    ).toMatchObject({ acertos: 3, tipo: "corrigida" });
  });
});

describe("pontos e resultado da tentativa", () => {
  test("5 por acerto só na primeira tentativa", () => {
    expect([
      pontosDaTentativa(1, 2),
      pontosDaTentativa(1, 0),
      pontosDaTentativa(2, 3),
    ]).toEqual([10, 0, 0]);
  });

  const gravada = (
    numero: number,
    alternativas: number[],
    aprovada: boolean
  ): TentativaGravada => ({
    acertos: alternativas.filter((a) => a % 2 === 0).length,
    aprovada,
    numero,
    respostas: alternativas.map((a, i) => ({
      alternativaId: A(a),
      certa: a % 2 === 0,
      perguntaId: P(i + 1),
    })),
    total: 3,
  });

  test("reprovada: diz qual errou e esconde a certa; aprovada na 2ª: mostra a certa, pontos só da primeira", () => {
    const primeira = gravada(1, [2, 3, 5], false);
    const reprovada = resultadoDaTentativa(PERGUNTAS, primeira, primeira);
    expect(reprovada).toEqual({
      acertos: 1,
      aprovada: false,
      paraPassar: 3,
      pontos: 5,
      pontosDaPrimeira: 5,
      respostas: [
        { alternativaId: A(2), certa: true, certaId: null, perguntaId: P(1) },
        { alternativaId: A(3), certa: false, certaId: null, perguntaId: P(2) },
        { alternativaId: A(5), certa: false, certaId: null, perguntaId: P(3) },
      ],
      tentativa: 1,
      total: 3,
    });
    const aprovada = resultadoDaTentativa(
      PERGUNTAS,
      gravada(2, [2, 4, 6], true),
      primeira
    );
    expect(aprovada).toMatchObject({
      aprovada: true,
      pontos: 0,
      pontosDaPrimeira: 5,
      respostas: [{ certaId: A(2) }, { certaId: A(4) }, { certaId: A(6) }],
      tentativa: 2,
    });
  });

  test("as respostas saem na ordem das perguntas, sem a pergunta que o admin apagou", () => {
    const fora = { ...gravada(1, [2, 3, 5], false) };
    const embaralhada: TentativaGravada = {
      ...fora,
      respostas: [
        ...fora.respostas.toReversed(),
        { alternativaId: "x", certa: true, perguntaId: "apagada" },
      ],
    };
    expect(
      resultadoDaTentativa(PERGUNTAS, embaralhada, embaralhada).respostas.map(
        (r) => r.perguntaId
      )
    ).toEqual([P(1), P(2), P(3)]);
  });

  test("o questionário da aula sai sem a certa, e sem tentativa a última é null", () => {
    const q = montarQuestionarioDaAula(PERGUNTAS, []);
    expect(q?.ultima).toBeNull();
    expect(q?.paraPassar).toBe(3);
    expect(JSON.stringify(q?.perguntas)).not.toContain("certa");
    expect(montarQuestionarioDaAula([], [])).toBeNull();
  });
});

describe("marcaDoQuestionario", () => {
  test("sem pergunta, a fazer, reprovado com a nota, aprovado", () => {
    expect(marcaDoQuestionario(0, undefined)).toEqual({ tipo: "sem" });
    expect(marcaDoQuestionario(2, undefined)).toEqual({ tipo: "a_fazer" });
    expect(
      marcaDoQuestionario(2, {
        aprovada: false,
        tentativas: 2,
        ultima: { acertos: 1, total: 2 },
      })
    ).toEqual({ tipo: "reprovado", ultima: { acertos: 1, total: 2 } });
    expect(
      marcaDoQuestionario(2, {
        aprovada: true,
        tentativas: 1,
        ultima: { acertos: 2, total: 2 },
      })
    ).toEqual({ tipo: "aprovado" });
  });
});
