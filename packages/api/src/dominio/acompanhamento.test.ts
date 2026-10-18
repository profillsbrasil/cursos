import { describe, expect, test } from "bun:test";

import {
  acompanharCurso,
  type LinhasDaBusca,
  type LinhasDaPessoa,
  montarBusca,
} from "./acompanhamento";
import { cursoCat, idAula } from "./exemplo";
import { estudoDe, type LinhasHistorico } from "./historico";
import type { CursoId, DiaISO } from "./tipos";

const em = (iso: string) => new Date(iso);

/** Linhas do histórico com datas literais; o que não vem fica vazio. */
const linhas = (o: Partial<LinhasHistorico>): LinhasHistorico => ({
  assistidas: [],
  certificados: [],
  posicoes: [],
  questionarios: [],
  ...o,
});

const assistida = (aulaId: string, iso: string) => ({
  assistidaEm: em(iso),
  aulaId,
});

const certificado = (cursoId: string, iso: string) => ({
  codigo: `CERT-${cursoId}`,
  cursoId,
  emitidoEm: em(iso),
});

// a: módulo 0 com 2 aulas, módulo 1 com 1 aula.
const A = cursoCat("a", { aulas: [2, 1] });

describe("acompanharCurso, um estado por linha da tabela", () => {
  test("sem estudo: nunca abriu", () => {
    expect(acompanharCurso(A, estudoDe(linhas({})))).toEqual({
      progresso: { feitas: 0, pct: 0, total: 3 },
      situacao: { tipo: "nunca_abriu" },
    });
  });

  test("posição em 0 s não é estudo", () => {
    const e = estudoDe(
      linhas({
        posicoes: [
          {
            atualizadaEm: em("2026-10-13T15:00:00Z"),
            aulaId: idAula("a", 0, 1),
            posicaoSeg: 0,
          },
        ],
      })
    );
    expect(acompanharCurso(A, e).situacao).toEqual({ tipo: "nunca_abriu" });
  });

  test("estudando: a aula do Continuar e o dia do último estudo em São Paulo", () => {
    // 01:30 UTC de 14/10 é 22:30 de 13/10 em São Paulo.
    const e = estudoDe(
      linhas({
        assistidas: [assistida(idAula("a", 0, 1), "2026-10-12T15:00:00Z")],
        posicoes: [
          {
            atualizadaEm: em("2026-10-14T01:30:00Z"),
            aulaId: idAula("a", 0, 2),
            posicaoSeg: 120,
          },
        ],
      })
    );
    expect(acompanharCurso(A, e)).toEqual({
      progresso: { feitas: 1, pct: 33, total: 3 },
      situacao: {
        onde: { aula: 2, modulo: 0 },
        tipo: "estudando",
        ultimoEstudo: "2026-10-13" as DiaISO,
      },
    });
  });

  test("estudando com a última aula tocada já assistida: a próxima pendente", () => {
    const e = estudoDe(
      linhas({
        assistidas: [
          assistida(idAula("a", 0, 1), "2026-09-20T15:00:00Z"),
          assistida(idAula("a", 0, 2), "2026-09-21T15:00:00Z"),
        ],
      })
    );
    expect(acompanharCurso(A, e).situacao).toEqual({
      onde: { aula: 1, modulo: 1 },
      tipo: "estudando",
      ultimoEstudo: "2026-09-21" as DiaISO,
    });
  });

  test("todas as aulas vistas e questionário por aprovar: faltam questionários, e a tentativa conta como estudo", () => {
    const comQuiz = cursoCat("a", { aulas: [2, 1], perguntas: 2 });
    const e = estudoDe(
      linhas({
        assistidas: [
          assistida(idAula("a", 0, 1), "2026-09-28T15:00:00Z"),
          assistida(idAula("a", 0, 2), "2026-09-29T15:00:00Z"),
          assistida(idAula("a", 1, 1), "2026-09-30T15:00:00Z"),
        ],
        questionarios: [
          {
            aprovada: true,
            aulaId: idAula("a", 0, 1),
            tentativas: 1,
            ultimaEm: em("2026-10-02T15:00:00Z"),
            ultimosAcertos: 2,
            ultimoTotal: 2,
          },
        ],
      })
    );
    expect(acompanharCurso(comQuiz, e)).toMatchObject({
      progresso: { feitas: 3, pct: 100, total: 3 },
      situacao: {
        aprovados: 1,
        tipo: "faltam_questionarios",
        total: 3,
        ultimoEstudo: "2026-10-02",
      },
    });
  });

  test("com certificado: concluído no dia do certificado", () => {
    const e = estudoDe(
      linhas({ certificados: [certificado("a", "2026-09-12T15:00:00Z")] })
    );
    expect(acompanharCurso(A, e).situacao).toEqual({
      em: "2026-09-12" as DiaISO,
      tipo: "concluido",
    });
  });

  test("curso em produção, mesmo começado: em produção", () => {
    const emProducao = cursoCat("p", { aulas: [1], status: "em_producao" });
    const e = estudoDe(
      linhas({
        assistidas: [assistida(idAula("p", 0, 1), "2026-09-12T15:00:00Z")],
      })
    );
    expect(acompanharCurso(emProducao, e)).toMatchObject({
      progresso: { feitas: 1, pct: 100, total: 1 },
      situacao: { tipo: "em_producao" },
    });
  });
});

describe("montarBusca", () => {
  const HOJE = "2026-10-14" as DiaISO;
  const pessoa = (userId: string) => ({
    email: `${userId}@exemplo.com`,
    foto: null,
    nome: userId,
    userId,
  });
  const ativa = (cursoId: string, iso: string) => ({
    cursoId,
    liberadaEm: em(iso),
    origem: "admin" as const,
    revogadaEm: null,
  });
  const curso = (id: string, aulas: number, status = "publicado" as const) => ({
    id,
    modulos: [
      {
        aulas: Array.from({ length: aulas }, (_, i) => ({
          id: idAula(id, 0, i + 1),
          perguntas: 0,
        })),
        numero: 0,
        titulo: "Módulo 0",
      },
    ],
    status,
    titulo: `Curso ${id}`,
  });
  // x (2 aulas), y (1 aula), z em produção, w (1 aula).
  const catalogo: Omit<LinhasDaBusca, "pessoas"> = {
    cursos: [
      curso("x", 2),
      curso("y", 1),
      { ...curso("z", 1), status: "em_producao" },
      curso("w", 1),
    ],
  };
  const situacaoDe = (p: Omit<LinhasDaPessoa, "userId">) =>
    montarBusca(
      { pessoas: [pessoa("user_a")], total: 1 },
      { ...catalogo, pessoas: [{ ...p, userId: "user_a" }] },
      HOJE
    ).pessoas[0]?.situacao;

  test("nunca recebeu liberação", () => {
    expect(situacaoDe({ ...linhas({}), liberacoes: [] })).toEqual({
      revogadas: 0,
      tipo: "sem_liberacao",
      ultimaRevogacao: null,
    });
  });

  test("só liberações revogadas: quantas e o dia da última", () => {
    expect(
      situacaoDe({
        ...linhas({}),
        liberacoes: [
          {
            ...ativa("w", "2026-08-10T15:00:00Z"),
            revogadaEm: em("2026-09-02T15:00:00Z"),
          },
          {
            ...ativa("x", "2026-08-11T15:00:00Z"),
            revogadaEm: em("2026-08-20T15:00:00Z"),
          },
        ],
      })
    ).toEqual({
      revogadas: 2,
      tipo: "sem_liberacao",
      ultimaRevogacao: "2026-09-02" as DiaISO,
    });
  });

  test("liberação ativa sem estudo: nunca abriu, desde a liberação mais antiga", () => {
    expect(
      situacaoDe({
        ...linhas({}),
        liberacoes: [
          ativa("x", "2026-10-02T15:00:00Z"),
          ativa("z", "2026-10-02T15:00:00Z"),
          ativa("w", "2026-09-30T15:00:00Z"),
        ],
      })
    ).toEqual({
      desde: "2026-09-30" as DiaISO,
      // z está em produção e fica fora da conta de cursos.
      numeros: { concluidos: 0, cursos: 2, emProducao: 1 },
      tipo: "nunca_abriu",
    });
  });

  test("estudo só em curso que ela não alcança mais não conta", () => {
    expect(
      situacaoDe({
        ...linhas({
          assistidas: [assistida(idAula("w", 0, 1), "2026-09-01T15:00:00Z")],
        }),
        liberacoes: [ativa("x", "2026-10-02T15:00:00Z")],
      })
    ).toMatchObject({ tipo: "nunca_abriu" });
  });

  test("estudando: cursos que abrem, concluídos e o último estudo", () => {
    expect(
      situacaoDe({
        ...linhas({
          assistidas: [
            assistida(idAula("x", 0, 1), "2026-09-01T15:00:00Z"),
            assistida(idAula("x", 0, 2), "2026-09-02T15:00:00Z"),
            assistida(idAula("w", 0, 1), "2026-10-13T15:00:00Z"),
          ],
          certificados: [certificado("x", "2026-09-03T15:00:00Z")],
        }),
        liberacoes: [
          ativa("x", "2026-08-08T15:00:00Z"),
          ativa("y", "2026-08-08T15:00:00Z"),
          ativa("w", "2026-08-18T15:00:00Z"),
        ],
      })
    ).toEqual({
      numeros: { concluidos: 1, cursos: 3, emProducao: 0 },
      tipo: "estudando",
      ultimoEstudo: "2026-10-13" as DiaISO,
    });
  });

  test("todo curso que abre com certificado: concluiu tudo", () => {
    expect(
      situacaoDe({
        ...linhas({
          certificados: [
            certificado("x", "2026-09-03T15:00:00Z"),
            certificado("y", "2026-09-10T15:00:00Z"),
          ],
        }),
        liberacoes: [
          ativa("x", "2026-08-08T15:00:00Z"),
          ativa("y", "2026-08-08T15:00:00Z"),
          ativa("z", "2026-08-08T15:00:00Z"),
        ],
      })
    ).toEqual({
      numeros: { concluidos: 2, cursos: 2, emProducao: 1 },
      tipo: "concluiu_tudo",
      ultimoEstudo: "2026-09-10" as DiaISO,
    });
  });

  test("mantém a ordem do Clerk, o total e o dia de hoje", () => {
    const busca = montarBusca(
      { pessoas: [pessoa("user_b"), pessoa("user_a")], total: 7 },
      {
        ...catalogo,
        pessoas: [
          { ...linhas({}), liberacoes: [], userId: "user_a" },
          { ...linhas({}), liberacoes: [], userId: "user_b" },
        ],
      },
      HOJE
    );
    expect([
      busca.hoje,
      busca.total,
      busca.pessoas.map((p) => p.userId),
    ]).toEqual([HOJE, 7, ["user_b", "user_a"]]);
  });

  test("os cursos que a pessoa tem, com a origem; o revogado fica fora", () => {
    const busca = montarBusca(
      { pessoas: [pessoa("user_a")], total: 1 },
      {
        ...catalogo,
        pessoas: [
          {
            ...linhas({}),
            liberacoes: [
              ativa("x", "2026-08-08T15:00:00Z"),
              { ...ativa("y", "2026-08-09T15:00:00Z"), origem: "troca" },
              {
                ...ativa("w", "2026-08-10T15:00:00Z"),
                revogadaEm: em("2026-09-02T15:00:00Z"),
              },
            ],
            userId: "user_a",
          },
        ],
      },
      HOJE
    );
    expect(busca.pessoas[0]?.ativas).toEqual([
      { cursoId: "x" as CursoId, origem: "admin" },
      { cursoId: "y" as CursoId, origem: "troca" },
    ]);
  });

  test("curso liberado fora do catálogo do statement é erro, não silêncio", () => {
    expect(() =>
      situacaoDe({
        ...linhas({}),
        liberacoes: [ativa("sumiu", "2026-08-08T15:00:00Z")],
      })
    ).toThrow("Curso sumiu alcançado e fora do catálogo da busca.");
  });
});
