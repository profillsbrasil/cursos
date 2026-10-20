import { describe, expect, test } from "bun:test";
import type { Acompanhamento } from "@cursos/api/dominio/acompanhamento";
import type { LiberacaoNaTela } from "@cursos/api/dominio/liberacao";
import type { CursoId, DiaISO, LiberacaoId } from "@cursos/api/dominio/tipos";

import { noDia } from "@/lib/formato";

import {
  dataDaLiberacao,
  fraseDaPessoa,
  fraseDoCurso,
  seloDaPessoa,
  seloDoCurso,
} from "./acompanhamento";

const HOJE = "2026-10-14";
const dia = (d: string) => d as DiaISO;

const curso = (
  situacao: Acompanhamento["situacao"],
  feitas = 0,
  total = 2
): Acompanhamento => ({
  progresso: { feitas, pct: Math.floor((feitas * 100) / total), total },
  situacao,
});

describe("noDia", () => {
  test("hoje, ontem, o dia do ano e o de outro ano", () => {
    expect(
      ["2026-10-14", "2026-10-13", "2026-09-21", "2025-12-30"].map((d) =>
        noDia(d, HOJE)
      )
    ).toEqual(["hoje", "ontem", "em 21 de set.", "em 30 de dez. de 2025"]);
  });
});

describe("fraseDaPessoa", () => {
  test("os números e o dia do último estudo, sem rótulo de parado", () => {
    expect(
      fraseDaPessoa(
        {
          numeros: { concluidos: 2, cursos: 5, emProducao: 0 },
          tipo: "estudando",
          ultimoEstudo: dia("2026-09-21"),
        },
        HOJE
      )
    ).toBe("2 de 5 cursos concluídos · último estudo em 21 de set.");
  });

  test("com curso em produção, a frase diz quantos estão em produção", () => {
    expect(
      fraseDaPessoa(
        {
          numeros: { concluidos: 1, cursos: 3, emProducao: 2 },
          tipo: "estudando",
          ultimoEstudo: dia("2026-09-21"),
        },
        HOJE
      )
    ).toBe(
      "1 de 3 cursos concluídos · 2 em produção · último estudo em 21 de set."
    );
  });

  test("nunca abriu diz desde quando tem acesso, sem repetir o selo", () => {
    expect(
      fraseDaPessoa(
        {
          desde: dia("2026-10-02"),
          numeros: { concluidos: 0, cursos: 1, emProducao: 0 },
          tipo: "nunca_abriu",
        },
        HOJE
      )
    ).toBe("Com acesso desde 2 de out.");
  });

  test("nunca abriu, com curso em produção, diz quantos estão em produção", () => {
    expect(
      fraseDaPessoa(
        {
          desde: dia("2026-10-02"),
          numeros: { concluidos: 0, cursos: 2, emProducao: 1 },
          tipo: "nunca_abriu",
        },
        HOJE
      )
    ).toBe("Com acesso desde 2 de out. · 1 em produção");
  });

  test("sem liberação: sem frase quando o selo já diz tudo; com revogadas, quantas e quando", () => {
    expect(
      [
        { revogadas: 0, ultimaRevogacao: null },
        { revogadas: 1, ultimaRevogacao: dia("2026-09-02") },
        { revogadas: 3, ultimaRevogacao: dia("2026-10-13") },
      ].map((r) =>
        fraseDaPessoa({ ...r, tipo: "sem_liberacao" } as const, HOJE)
      )
    ).toEqual([
      null,
      "1 liberação revogada em 2 de set.",
      "3 liberações revogadas, a última ontem",
    ]);
  });

  test("os selos da pessoa", () => {
    expect(
      [
        seloDaPessoa({
          revogadas: 0,
          tipo: "sem_liberacao",
          ultimaRevogacao: null,
        }),
        seloDaPessoa({
          numeros: { concluidos: 1, cursos: 1, emProducao: 0 },
          tipo: "concluiu_tudo",
          ultimoEstudo: dia(HOJE),
        }),
      ].map((s) => s.rotulo)
    ).toEqual(["Sem liberação", "Concluiu tudo"]);
  });
});

describe("fraseDoCurso", () => {
  test("curso estudando: módulo e aula, e o último estudo à parte", () => {
    const a = curso({
      onde: { aula: 1, modulo: 2 },
      tipo: "estudando",
      ultimoEstudo: dia("2026-09-21"),
    });
    expect([
      fraseDoCurso(a, HOJE),
      seloDoCurso(a.situacao.tipo).rotulo,
    ]).toEqual([
      { quando: "último estudo em 21 de set.", texto: "Módulo 2, aula 1" },
      "Estudando",
    ]);
  });

  test("curso com questionário pendente conta as aulas vistas e os questionários aprovados", () => {
    const a = curso(
      {
        aprovados: 1,
        tipo: "faltam_questionarios",
        total: 2,
        ultimoEstudo: dia("2026-09-30"),
      },
      2,
      2
    );
    expect(fraseDoCurso(a, HOJE)).toEqual({
      quando: "último estudo em 30 de set.",
      texto: "Viu as 2 aulas. 1 de 2 questionários aprovados",
    });
    expect(seloDoCurso("faltam_questionarios").rotulo).toBe(
      "Faltam questionários"
    );
  });

  test("curso em produção e nunca aberto", () => {
    expect(
      [curso({ tipo: "em_producao" }), curso({ tipo: "nunca_abriu" })].map(
        (c) => [
          fraseDoCurso(c, HOJE)?.texto ?? null,
          seloDoCurso(c.situacao.tipo).rotulo,
        ]
      )
    ).toEqual([
      ["Em produção. A pessoa ainda não vê o curso", "Em produção"],
      [null, "Nunca abriu"],
    ]);
  });
});

describe("as datas do item da liberação", () => {
  const concluido = curso({
    em: dia("2026-09-17"),
    tipo: "concluido",
  });
  const item = (
    liberadaEm: string,
    acao: LiberacaoNaTela["acao"] = { tipo: "revogar" },
    origem: LiberacaoNaTela["origem"] = "admin"
  ): LiberacaoNaTela => ({
    acao,
    acompanhamento: concluido,
    curso: { id: "c1" as CursoId, titulo: "Segurança" },
    id: "l1" as LiberacaoId,
    liberadaEm,
    origem,
  });

  test("Concluído e Liberada em usam o mesmo formato curto", () => {
    const l = item("2026-08-20T15:00:00.000Z");
    expect([
      fraseDoCurso(l.acompanhamento, HOJE)?.texto,
      dataDaLiberacao(l, HOJE),
    ]).toEqual(["Concluído em 17 de set.", "Liberada em 20 de ago."]);
  });

  test("a troca, a revogação e o ano de outra liberação", () => {
    expect(
      [
        item("2026-08-20T15:00:00.000Z", { tipo: "fixa_por_troca" }, "troca"),
        item("2025-11-03T15:00:00.000Z", {
          em: "2026-10-02T15:00:00.000Z",
          tipo: "revogada",
        }),
      ].map((l) => dataDaLiberacao(l, HOJE))
    ).toEqual([
      "Trocado por pontos em 20 de ago.",
      "Liberada em 3 de nov. de 2025 · revogada em 2 de out.",
    ]);
  });
});
