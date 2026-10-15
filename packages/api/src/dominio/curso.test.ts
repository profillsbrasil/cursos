import { describe, expect, test } from "bun:test";

import { alcance, estadoDoCurso, niveis, progresso } from "./curso";
import { cursoCat, historico, idAula } from "./exemplo";
import { historicoDe } from "./historico";
import type { AulaId } from "./tipos";

const todas = (chave: string, aulas: number[]) =>
  aulas.flatMap((qtd, m) =>
    Array.from({ length: qtd }, (_, p) => idAula(chave, m, p + 1))
  );

describe("estadoDoCurso", () => {
  test("certificado mantém concluido mesmo com aula nova no curso", () => {
    const c = cursoCat("c", { aulas: [3] });
    const h = historico({ assistidas: todas("c", [2]), certificados: ["c"] });
    expect(estadoDoCurso(c, h).tipo).toBe("concluido");
  });

  test("curso concluído que volta para em produção continua concluido", () => {
    const c = cursoCat("c", { aulas: [2], status: "em_producao" });
    const h = historico({ certificados: ["c"] });
    expect(estadoDoCurso(c, h).tipo).toBe("concluido");
  });

  test("curso em produção é em_breve mesmo com liberação", () => {
    const c = cursoCat("c", { aulas: [2], status: "em_producao" });
    expect(estadoDoCurso(c, historico({}))).toEqual({ tipo: "em_breve" });
  });

  test("curso começado que voltou para em produção é em_breve", () => {
    const c = cursoCat("c", { aulas: [3], status: "em_producao" });
    const h = historico({ assistidas: [idAula("c", 0, 1)] });
    expect(estadoDoCurso(c, h)).toEqual({ tipo: "em_breve" });
  });

  test("curso publicado sem aulas é em_breve e nunca vira prova", () => {
    const c = cursoCat("c", { aulas: [] });
    expect(estadoDoCurso(c, historico({})).tipo).toBe("em_breve");
    const vazioDeAulas = cursoCat("v", { aulas: [0] });
    expect(estadoDoCurso(vazioDeAulas, historico({})).tipo).toBe("em_breve");
  });

  test("todas as aulas assistidas sem certificado é prova", () => {
    const c = cursoCat("c", { aulas: [2, 1] });
    const h = historico({ assistidas: todas("c", [2, 1]) });
    expect(estadoDoCurso(c, h)).toEqual({ tipo: "prova" });
  });

  test("posição salva sem aula assistida já conta como em_andamento", () => {
    const c = cursoCat("c", { aulas: [3] });
    const h = historico({ posicoes: [[idAula("c", 0, 1), 30]] });
    expect(estadoDoCurso(c, h)).toEqual({
      proximaAula: idAula("c", 0, 1) as AulaId,
      tipo: "em_andamento",
    });
  });

  test("sem aula assistida e sem posição é nao_iniciado", () => {
    const c = cursoCat("c", { aulas: [3] });
    expect(estadoDoCurso(c, historico({}))).toEqual({
      primeiraAula: idAula("c", 0, 1) as AulaId,
      tipo: "nao_iniciado",
    });
  });
});

describe("alcance", () => {
  const a = cursoCat("a", { aulas: [2] });
  const b = cursoCat("b", { aulas: [2] });

  test("os cursos liberados na ordem em que chegaram, cada um com o próprio estado", () => {
    const h = historico({ assistidas: [idAula("b", 0, 1)] });
    expect(
      alcance([b, a], h).map((x) => [x.curso.slug, x.estado.tipo])
    ).toEqual([
      ["b", "em_andamento"],
      ["a", "nao_iniciado"],
    ]);
  });

  test("curso liberado duas vezes aparece uma vez, no lugar da primeira", () => {
    expect(alcance([a, b, a], historico({})).map((x) => x.curso.slug)).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("progresso", () => {
  test("199 de 200 aulas mostra 99%", () => {
    const c = cursoCat("c", { aulas: [200] });
    const assistidas = new Set(todas("c", [199]) as AulaId[]);
    expect(progresso(c, assistidas)).toEqual({
      feitas: 199,
      pct: 99,
      total: 200,
    });
  });

  test("aula assistida de outro curso não entra no progresso", () => {
    const c = cursoCat("c", { aulas: [4] });
    const assistidas = new Set([
      idAula("c", 0, 1),
      idAula("outro", 0, 1),
      idAula("outro", 0, 2),
    ] as AulaId[]);
    expect(progresso(c, assistidas)).toEqual({ feitas: 1, pct: 25, total: 4 });
  });
});

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

describe("historicoDe", () => {
  test("posição em 0 s não entra no histórico e não conta como começado", () => {
    const h = historicoDe({
      assistidas: [],
      certificados: [],
      posicoes: [
        {
          atualizadaEm: new Date("2026-10-07T12:00:00Z"),
          aulaId: idAula("b", 0, 1),
          posicaoSeg: 0,
        },
        {
          atualizadaEm: new Date("2026-10-07T12:00:00Z"),
          aulaId: idAula("c", 0, 1),
          posicaoSeg: 12,
        },
      ],
    });
    expect([...h.posicoes.keys()]).toEqual([idAula("c", 0, 1) as AulaId]);
    const b = cursoCat("b", { aulas: [2] });
    expect(estadoDoCurso(b, h).tipo).toBe("nao_iniciado");
  });
});
