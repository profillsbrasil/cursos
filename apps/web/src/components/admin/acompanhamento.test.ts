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
  titulo: string,
  situacao: Acompanhamento["situacao"],
  feitas = 0,
  total = 2
): Acompanhamento => ({
  progresso: { feitas, pct: Math.floor((feitas * 100) / total), total },
  situacao,
  titulo,
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
          numeros: { concluidos: 2, cursos: 5, liberacoes: 5 },
          tipo: "estudando",
          ultimoEstudo: dia("2026-09-21"),
        },
        HOJE
      )
    ).toBe(
      "5 liberações · 2 de 5 cursos concluídos · último estudo em 21 de set."
    );
  });

  test("nunca abriu diz desde quando tem liberação", () => {
    expect(
      fraseDaPessoa(
        {
          desde: dia("2026-10-02"),
          numeros: { concluidos: 0, cursos: 1, liberacoes: 1 },
          tipo: "nunca_abriu",
        },
        HOJE
      )
    ).toBe("1 liberação desde 2 de out. · nenhuma aula aberta");
  });

  test("sem liberação: nunca recebeu, uma revogada ou várias", () => {
    expect(
      [
        { revogadas: 0, ultimaRevogacao: null },
        { revogadas: 1, ultimaRevogacao: dia("2026-09-02") },
        { revogadas: 3, ultimaRevogacao: dia("2026-10-13") },
      ].map((r) =>
        fraseDaPessoa({ ...r, tipo: "sem_liberacao" } as const, HOJE)
      )
    ).toEqual([
      "Nunca recebeu liberação",
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
          numeros: { concluidos: 1, cursos: 1, liberacoes: 1 },
          tipo: "concluiu_tudo",
          ultimoEstudo: dia(HOJE),
        }),
      ].map((s) => s.rotulo)
    ).toEqual(["Sem liberação", "Concluiu tudo"]);
  });
});

describe("fraseDoCurso", () => {
  test("curso estudando: módulo e aula, e o último estudo à parte", () => {
    const a = curso("Nova Rotina", {
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

  test("curso na prova conta as aulas vistas", () => {
    const a = curso(
      "Autoavaliação",
      { tipo: "falta_prova", ultimoEstudo: dia("2026-09-30") },
      2,
      2
    );
    expect(fraseDoCurso(a, HOJE)).toEqual({
      quando: "último estudo em 30 de set.",
      texto: "Viu as 2 aulas. Falta a prova",
    });
  });

  test("curso em produção e nunca aberto", () => {
    expect(
      [
        curso("A", { tipo: "em_producao" }),
        curso("B", { tipo: "nunca_abriu" }),
      ].map((c) => [
        fraseDoCurso(c, HOJE).texto,
        seloDoCurso(c.situacao.tipo).rotulo,
      ])
    ).toEqual([
      ["Em produção. A pessoa ainda não vê o curso", "Em produção"],
      ["Nenhuma aula aberta", "Nunca abriu"],
    ]);
  });
});

describe("as datas do item da liberação", () => {
  const concluido = curso("Segurança", {
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
      fraseDoCurso(l.acompanhamento, HOJE).texto,
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
