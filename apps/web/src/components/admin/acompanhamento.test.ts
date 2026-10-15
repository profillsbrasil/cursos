import { describe, expect, test } from "bun:test";
import type {
  Acompanhamento,
  CursoAcompanhado,
} from "@cursos/api/dominio/acompanhamento";
import type { DiaISO } from "@cursos/api/dominio/tipos";

import { noDia } from "@/lib/formato";

import {
  fraseDaLiberacao,
  fraseDaPessoa,
  fraseNaTrilha,
  seloDaLiberacao,
  seloDaPessoa,
} from "./acompanhamento";

const HOJE = "2026-10-14";
const dia = (d: string) => d as DiaISO;

const curso = (
  titulo: string,
  situacao: CursoAcompanhado["situacao"],
  feitas = 0,
  total = 2
): CursoAcompanhado => ({
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
    ).toEqual(["hoje", "ontem", "em 21 set", "em 30 dez 2025"]);
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
    ).toBe("5 liberações · 2 de 5 cursos concluídos · último estudo em 21 set");
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
    ).toBe("1 liberação desde 2 out · nenhuma aula aberta");
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
      "1 liberação revogada em 2 set",
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

describe("fraseDaLiberacao", () => {
  test("curso estudando: módulo e aula, e o último estudo à parte", () => {
    const a: Acompanhamento = {
      curso: curso("Nova Rotina", {
        onde: { aula: 1, modulo: 2 },
        tipo: "estudando",
        ultimoEstudo: dia("2026-09-21"),
      }),
      tipo: "curso",
    };
    expect([fraseDaLiberacao(a, HOJE), seloDaLiberacao(a).rotulo]).toEqual([
      { quando: "último estudo em 21 set", texto: "Módulo 2, aula 1" },
      "Estudando",
    ]);
  });

  test("curso na prova conta as aulas vistas", () => {
    const a: Acompanhamento = {
      curso: curso(
        "Autoavaliação",
        { tipo: "falta_prova", ultimoEstudo: dia("2026-09-30") },
        2,
        2
      ),
      tipo: "curso",
    };
    expect(fraseDaLiberacao(a, HOJE)).toEqual({
      quando: "último estudo em 30 set",
      texto: "Viu as 2 aulas. Falta a prova",
    });
  });

  const trilha = (
    situacao: Extract<Acompanhamento, { tipo: "trilha" }>["situacao"],
    cursos: (CursoAcompanhado & { posicao: number })[],
    daVez: number | null
  ): Acompanhamento => ({
    aulas: { feitas: 0, pct: 0, total: 0 },
    concluidos: cursos.filter((c) => c.situacao.tipo === "concluido").length,
    cursos,
    daVez,
    situacao,
    tipo: "trilha",
    ultimoEstudo: dia("2026-09-12"),
  });

  test("trilha em curso fala do curso da vez e usa o selo dele", () => {
    const a = trilha(
      "em_curso",
      [
        {
          ...curso("Segurança", { em: dia("2026-09-12"), tipo: "concluido" }),
          posicao: 1,
        },
        { ...curso("Envasadora", { tipo: "nunca_abriu" }), posicao: 2 },
      ],
      2
    );
    expect([fraseDaLiberacao(a, HOJE), seloDaLiberacao(a).rotulo]).toEqual([
      { quando: null, texto: "Curso 2 de 2, Envasadora: nenhuma aula aberta" },
      "Nunca abriu",
    ]);
  });

  test("trilha esperando produção diz quais cursos estão em produção", () => {
    const a = trilha(
      "aguardando_producao",
      [
        {
          ...curso("Segurança", { em: dia("2026-09-12"), tipo: "concluido" }),
          posicao: 1,
        },
        { ...curso("Envasadora", { tipo: "em_producao" }), posicao: 2 },
        { ...curso("Montagem", { tipo: "em_producao" }), posicao: 3 },
      ],
      null
    );
    expect([fraseDaLiberacao(a, HOJE), seloDaLiberacao(a).rotulo]).toEqual([
      {
        quando: "último estudo em 12 set",
        texto: "Concluiu 1 de 3 cursos. Os cursos 2 e 3 estão em produção",
      },
      "Aguardando produção",
    ]);
  });

  test("a linha do curso na trilha", () => {
    expect(
      [
        curso("A", {
          onde: { aula: 4, modulo: 8 },
          tipo: "estudando",
          ultimoEstudo: dia("2026-10-13"),
        }),
        curso("B", {
          depoisDe: { posicao: 1, titulo: "A" },
          tipo: "bloqueado",
        }),
        curso("C", { em: dia("2026-09-12"), tipo: "concluido" }),
      ].map((c) => fraseNaTrilha(c, HOJE))
    ).toEqual([
      "Estudando · módulo 8, aula 4 · último estudo ontem",
      "Abre depois do curso 1",
      "Concluído em 12 set",
    ]);
  });
});
