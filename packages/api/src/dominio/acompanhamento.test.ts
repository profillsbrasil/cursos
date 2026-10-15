import { describe, expect, test } from "bun:test";

import {
  acompanharCurso,
  acompanharTrilha,
  estudoDe,
  type LinhasDaPessoa,
  type LinhasDoResumo,
  montarBusca,
} from "./acompanhamento";
import { cursoCat, idAula, trilhaCat } from "./exemplo";
import type { LinhasHistorico } from "./historico";
import type { CursoId, DiaISO } from "./tipos";

const em = (iso: string) => new Date(iso);

/** Linhas do histórico com datas literais; o que não vem fica vazio. */
const linhas = (o: Partial<LinhasHistorico>): LinhasHistorico => ({
  assistidas: [],
  certificados: [],
  posicoes: [],
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
      curso: {
        progresso: { feitas: 0, pct: 0, total: 3 },
        situacao: { tipo: "nunca_abriu" },
        titulo: "Curso a",
      },
      tipo: "curso",
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
    expect(acompanharCurso(A, e)).toMatchObject({
      curso: { situacao: { tipo: "nunca_abriu" } },
    });
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
      curso: {
        progresso: { feitas: 1, pct: 33, total: 3 },
        situacao: {
          onde: { aula: 2, modulo: 0 },
          tipo: "estudando",
          ultimoEstudo: "2026-10-13" as DiaISO,
        },
        titulo: "Curso a",
      },
      tipo: "curso",
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
    expect(acompanharCurso(A, e)).toMatchObject({
      curso: {
        situacao: {
          onde: { aula: 1, modulo: 1 },
          tipo: "estudando",
          ultimoEstudo: "2026-09-21",
        },
      },
    });
  });

  test("todas as aulas vistas e sem certificado: falta a prova", () => {
    const e = estudoDe(
      linhas({
        assistidas: [
          assistida(idAula("a", 0, 1), "2026-09-28T15:00:00Z"),
          assistida(idAula("a", 0, 2), "2026-09-29T15:00:00Z"),
          assistida(idAula("a", 1, 1), "2026-09-30T15:00:00Z"),
        ],
      })
    );
    expect(acompanharCurso(A, e)).toMatchObject({
      curso: {
        progresso: { feitas: 3, pct: 100, total: 3 },
        situacao: { tipo: "falta_prova", ultimoEstudo: "2026-09-30" },
      },
    });
  });

  test("com certificado: concluído no dia do certificado", () => {
    const e = estudoDe(
      linhas({ certificados: [certificado("a", "2026-09-12T15:00:00Z")] })
    );
    expect(acompanharCurso(A, e)).toMatchObject({
      curso: { situacao: { em: "2026-09-12", tipo: "concluido" } },
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
      curso: {
        progresso: { feitas: 1, pct: 100, total: 1 },
        situacao: { tipo: "em_producao" },
      },
    });
  });
});

describe("acompanharTrilha", () => {
  const X = cursoCat("x", { aulas: [2] });
  const Y = cursoCat("y", { aulas: [1] });
  const Z = cursoCat("z", { aulas: [1], status: "em_producao" });

  test("concluído, curso da vez e em produção, com a soma das aulas que abrem", () => {
    const e = estudoDe(
      linhas({
        assistidas: [
          assistida(idAula("x", 0, 1), "2026-09-01T15:00:00Z"),
          assistida(idAula("x", 0, 2), "2026-09-02T15:00:00Z"),
        ],
        certificados: [certificado("x", "2026-09-03T15:00:00Z")],
      })
    );
    expect(acompanharTrilha(trilhaCat("t", [X, Y, Z]), e, new Set())).toEqual({
      aulas: { feitas: 2, pct: 66, total: 3 },
      concluidos: 1,
      cursos: [
        {
          posicao: 1,
          progresso: { feitas: 2, pct: 100, total: 2 },
          situacao: { em: "2026-09-03" as DiaISO, tipo: "concluido" },
          titulo: "Curso x",
        },
        {
          posicao: 2,
          progresso: { feitas: 0, pct: 0, total: 1 },
          situacao: { tipo: "nunca_abriu" },
          titulo: "Curso y",
        },
        {
          posicao: 3,
          progresso: { feitas: 0, pct: 0, total: 1 },
          situacao: { tipo: "em_producao" },
          titulo: "Curso z",
        },
      ],
      daVez: 2,
      situacao: "em_curso",
      tipo: "trilha",
      ultimoEstudo: "2026-09-03" as DiaISO,
    });
  });

  test("o segundo curso espera o primeiro e diz qual", () => {
    const r = acompanharTrilha(
      trilhaCat("t", [X, Y]),
      estudoDe(linhas({})),
      new Set()
    );
    expect(r.tipo === "trilha" && r.cursos.map((c) => c.situacao)).toEqual([
      { tipo: "nunca_abriu" },
      { depoisDe: { posicao: 1, titulo: "Curso x" }, tipo: "bloqueado" },
    ]);
  });

  test("o curso liberado direto não espera o anterior", () => {
    const r = acompanharTrilha(
      trilhaCat("t", [X, Y]),
      estudoDe(linhas({})),
      new Set([Y.id])
    );
    expect(r.tipo === "trilha" && r.cursos[1]?.situacao).toEqual({
      tipo: "nunca_abriu",
    });
  });

  test("só o curso em produção sobrando: aguardando produção, sem curso da vez", () => {
    const r = acompanharTrilha(
      trilhaCat("t", [X, Z]),
      estudoDe(
        linhas({ certificados: [certificado("x", "2026-09-03T15:00:00Z")] })
      ),
      new Set()
    );
    expect(r).toMatchObject({
      concluidos: 1,
      daVez: null,
      situacao: "aguardando_producao",
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
  const ativa = (
    alvo: { cursoId?: string; trilhaId?: string },
    iso: string
  ) => ({
    cursoId: alvo.cursoId ?? null,
    liberadaEm: em(iso),
    revogadaEm: null,
    trilhaId: alvo.trilhaId ?? null,
  });
  const curso = (id: string, aulas: number, status = "publicado" as const) => ({
    id,
    modulos: [
      {
        aulas: Array.from({ length: aulas }, (_, i) => ({
          id: idAula(id, 0, i + 1),
        })),
      },
    ],
    status,
    titulo: `Curso ${id}`,
  });
  // Trilha t: x (2 aulas), y (1 aula), z em produção. Curso solto w (1 aula).
  const catalogo: Omit<LinhasDoResumo, "pessoas"> = {
    cursos: [
      curso("x", 2),
      curso("y", 1),
      { ...curso("z", 1), status: "em_producao" },
      curso("w", 1),
    ],
    trilhas: [{ cursos: ["x", "y", "z"], id: "t" }],
  };
  const resumoDe = (p: Omit<LinhasDaPessoa, "userId">) =>
    montarBusca(
      { pessoas: [pessoa("user_a")], total: 1 },
      { ...catalogo, pessoas: [{ ...p, userId: "user_a" }] },
      HOJE
    ).pessoas[0]?.resumo;

  test("nunca recebeu liberação", () => {
    expect(resumoDe({ ...linhas({}), liberacoes: [] })).toEqual({
      revogadas: 0,
      tipo: "sem_liberacao",
      ultimaRevogacao: null,
    });
  });

  test("só liberações revogadas: quantas e o dia da última", () => {
    expect(
      resumoDe({
        ...linhas({}),
        liberacoes: [
          {
            ...ativa({ cursoId: "w" }, "2026-08-10T15:00:00Z"),
            revogadaEm: em("2026-09-02T15:00:00Z"),
          },
          {
            ...ativa({ trilhaId: "t" }, "2026-08-11T15:00:00Z"),
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
      resumoDe({
        ...linhas({}),
        liberacoes: [
          ativa({ trilhaId: "t" }, "2026-10-02T15:00:00Z"),
          ativa({ cursoId: "w" }, "2026-09-30T15:00:00Z"),
        ],
      })
    ).toEqual({
      desde: "2026-09-30" as DiaISO,
      numeros: { concluidos: 0, cursos: 3, liberacoes: 2 },
      tipo: "nunca_abriu",
    });
  });

  test("estudo só em curso que ela não alcança mais não conta", () => {
    expect(
      resumoDe({
        ...linhas({
          assistidas: [assistida(idAula("w", 0, 1), "2026-09-01T15:00:00Z")],
        }),
        liberacoes: [ativa({ trilhaId: "t" }, "2026-10-02T15:00:00Z")],
      })
    ).toMatchObject({ tipo: "nunca_abriu" });
  });

  test("estudando: cursos que abrem, concluídos e o último estudo", () => {
    expect(
      resumoDe({
        ...linhas({
          assistidas: [
            assistida(idAula("x", 0, 1), "2026-09-01T15:00:00Z"),
            assistida(idAula("x", 0, 2), "2026-09-02T15:00:00Z"),
            assistida(idAula("w", 0, 1), "2026-10-13T15:00:00Z"),
          ],
          certificados: [certificado("x", "2026-09-03T15:00:00Z")],
        }),
        liberacoes: [
          ativa({ trilhaId: "t" }, "2026-08-08T15:00:00Z"),
          ativa({ cursoId: "w" }, "2026-08-18T15:00:00Z"),
        ],
      })
    ).toEqual({
      // z está em produção e fica fora; y espera e entra.
      numeros: { concluidos: 1, cursos: 3, liberacoes: 2 },
      tipo: "estudando",
      ultimoEstudo: "2026-10-13" as DiaISO,
    });
  });

  test("todo curso que abre com certificado: concluiu tudo", () => {
    expect(
      resumoDe({
        ...linhas({
          certificados: [
            certificado("x", "2026-09-03T15:00:00Z"),
            certificado("y", "2026-09-10T15:00:00Z"),
          ],
        }),
        liberacoes: [ativa({ trilhaId: "t" }, "2026-08-08T15:00:00Z")],
      })
    ).toEqual({
      numeros: { concluidos: 2, cursos: 2, liberacoes: 1 },
      tipo: "concluiu_tudo",
      ultimoEstudo: "2026-09-10" as DiaISO,
    });
  });

  test("curso liberado direto e também na trilha conta uma vez", () => {
    expect(
      resumoDe({
        ...linhas({}),
        liberacoes: [
          ativa({ trilhaId: "t" }, "2026-08-08T15:00:00Z"),
          ativa({ cursoId: "y" }, "2026-08-09T15:00:00Z"),
        ],
      })
    ).toMatchObject({ numeros: { cursos: 2, liberacoes: 2 } });
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

  test("curso liberado fora do catálogo do statement é erro, não silêncio", () => {
    expect(() =>
      resumoDe({
        ...linhas({}),
        liberacoes: [
          ativa({ cursoId: "sumiu" as CursoId }, "2026-08-08T15:00:00Z"),
        ],
      })
    ).toThrow("Curso sumiu alcançado e fora do catálogo da busca.");
  });
});
