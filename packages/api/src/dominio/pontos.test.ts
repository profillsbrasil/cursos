import { describe, expect, test } from "bun:test";

import { comoGanhar, itemDoExtrato, type LinhaDoExtrato } from "./pontos";
import { PONTOS } from "./regras";
import type { DiaISO } from "./tipos";

const linha = (mudar: Partial<LinhaDoExtrato>): LinhaDoExtrato => ({
  aula: null,
  criadoEm: new Date("2026-10-07T18:00:00Z"),
  curso: null,
  id: "l-1",
  liberacao: null,
  motivo: "sequencia_7_dias",
  pontos: 30,
  trilha: null,
  ...mudar,
});

describe("itemDoExtrato", () => {
  test("cada motivo vira o texto do fato, com o sinal do lançamento", () => {
    const linhas: LinhaDoExtrato[] = [
      linha({
        aula: { titulo: "O funil da semana" },
        motivo: "aula_assistida",
        pontos: 10,
      }),
      linha({
        curso: { titulo: "Nova rotina" },
        motivo: "curso_concluido",
        pontos: 100,
      }),
      linha({
        motivo: "trilha_concluida",
        pontos: 500,
        trilha: { titulo: "Comercial" },
      }),
      linha({}),
      linha({
        liberacao: {
          curso: { titulo: "Boas práticas de fabricação" },
        },
        motivo: "troca",
        pontos: -200,
      }),
    ];
    expect(linhas.map(itemDoExtrato).map((i) => [i.texto, i.pontos])).toEqual([
      ["Aula assistida: O funil da semana", 10],
      ["Curso concluído: Nova rotina", 100],
      ["Trilha concluída: Comercial", 500],
      ["7 dias úteis seguidos", 30],
      ["Troca: Boas práticas de fabricação", -200],
    ]);
  });

  test("o dia é o de São Paulo", () => {
    expect(
      itemDoExtrato(linha({ criadoEm: new Date("2026-10-07T02:00:00Z") })).dia
    ).toBe("2026-10-06" as DiaISO);
  });

  test("referência ausente é dado quebrado e lança", () => {
    expect(() => itemDoExtrato(linha({ motivo: "troca" }))).toThrow(
      "sem o fato"
    );
    expect(() => itemDoExtrato(linha({ motivo: "aula_assistida" }))).toThrow(
      "sem o fato"
    );
  });
});

describe("comoGanhar", () => {
  test("lista toda regra de PONTOS, na ordem do protótipo, com o valor da regra", () => {
    expect(comoGanhar()).toEqual([
      { pontos: 10, rotulo: "Aula assistida (90% do vídeo)" },
      { pontos: 5, rotulo: "Acerto no quiz de fixação, primeira tentativa" },
      { pontos: 50, rotulo: "Prova aprovada" },
      { pontos: 100, rotulo: "Curso concluído" },
      { pontos: 500, rotulo: "Trilha concluída" },
      { pontos: 30, rotulo: "7 dias úteis seguidos" },
    ]);
    expect(comoGanhar()).toHaveLength(Object.keys(PONTOS).length);
  });
});
