import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  aula,
  aulaAssistida,
  certificado,
  curso,
  liberacao,
  modulo,
  posicaoAula,
  trilha,
  trilhaCurso,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import {
  type CursoAcompanhado,
  montarBusca,
  type SituacaoNoCurso,
} from "../dominio/acompanhamento";
import type { CursoVM, PainelMeusCursos } from "../dominio/painel";
import type { DiaISO, EstadoCurso, Pessoa } from "../dominio/tipos";
import { createCaller } from "../routers/index";
import { resumoDasPessoas } from "./acompanhamento";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const ESTUDA = `user_teste${S}estuda`;
const NUNCA = `user_teste${S}nunca`;
const REVOGADA = `user_teste${S}revogada`;
const NADA = `user_teste${S}nada`;
const DIRETO = `user_teste${S}direto`;
const ALUNOS = [ESTUDA, NUNCA, REVOGADA, NADA, DIRETO];
const pessoas: Pessoa[] = ALUNOS.map((userId) => ({
  email: `${userId}@exemplo.com`,
  foto: null,
  nome: userId,
  userId,
}));

/** O estado do painel do aluno, na palavra do admin. */
const NA_PALAVRA_DO_ADMIN: Record<
  EstadoCurso["tipo"],
  SituacaoNoCurso["tipo"]
> = {
  bloqueado: "bloqueado",
  concluido: "concluido",
  em_andamento: "estudando",
  em_breve: "em_producao",
  nao_iniciado: "nunca_abriu",
  prova: "falta_prova",
};

/** Todos os cursos de Meus cursos, pelo id: os das trilhas e os soltos. */
const cursosDoPainel = (painel: PainelMeusCursos) =>
  new Map<string, CursoVM>(
    [...painel.trilhas.flatMap((t) => t.cursos), ...painel.soltos].map((c) => [
      c.id,
      c,
    ])
  );

describe.skipIf(URL_TESTE === null)("acompanhamento do admin", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const admin = createCaller(
    contextoDeTeste({ db, papel: "admin", pessoas, userId: "user_admin" })
  );
  const painelDe = (userId: string) =>
    createCaller(contextoDeTeste({ db, userId })).meusCursos.painel();
  const cursos: string[] = [];
  let trilhaId = "";
  /** Aulas por curso, em ordem: a, b, c (em produção) na trilha; d solto. */
  const aulas: Record<"a" | "b" | "c" | "d", string[]> = {
    a: [],
    b: [],
    c: [],
    d: [],
  };

  beforeAll(async () => {
    const chaves = ["a", "b", "c", "d"] as const;
    const novos = await db
      .insert(curso)
      .values(
        chaves.map((chave) => ({
          capaAlt: "Capa de teste",
          capaAltura: 720,
          capaLargura: 1280,
          capaUrl: "/capas/teste.jpg",
          slug: `teste-${S}-${chave}`,
          status:
            chave === "c" ? ("em_producao" as const) : ("publicado" as const),
          tema: "teste",
          titulo: `Curso ${S} ${chave}`,
        }))
      )
      .returning({ id: curso.id });
    cursos.push(...novos.map((c) => c.id));
    const modulos = await db
      .insert(modulo)
      .values(
        cursos.map((cursoId) => ({ cursoId, numero: 1, titulo: "Módulo" }))
      )
      .returning({ cursoId: modulo.cursoId, id: modulo.id });
    const criadas = await db
      .insert(aula)
      .values(
        modulos.flatMap((m) =>
          [1, 2].map((posicao) => ({
            duracaoSeg: 600,
            moduloId: m.id,
            posicao,
            titulo: `Aula ${posicao}`,
          }))
        )
      )
      .returning({
        id: aula.id,
        moduloId: aula.moduloId,
        posicao: aula.posicao,
      });
    for (const [i, chave] of chaves.entries()) {
      const m = modulos.find((x) => x.cursoId === cursos[i]);
      aulas[chave] = criadas
        .filter((x) => x.moduloId === m?.id)
        .sort((x, y) => x.posicao - y.posicao)
        .map((x) => x.id);
    }
    const [t] = await db
      .insert(trilha)
      .values({
        descricao: "Trilha de teste.",
        slug: `teste-${S}-t`,
        titulo: `Trilha ${S}`,
      })
      .returning({ id: trilha.id });
    trilhaId = t?.id ?? "";
    await db.insert(trilhaCurso).values(
      cursos.slice(0, 3).map((cursoId, i) => ({
        cursoId,
        posicao: i + 1,
        trilhaId,
      }))
    );
    const [a, b, , d] = cursos;
    const libera = (
      userId: string,
      alvo: { cursoId?: string; trilhaId?: string },
      revogada = false
    ) => ({
      ...alvo,
      liberadaEm: new Date("2026-10-01T15:00:00Z"),
      liberadaPor: "user_admin",
      origem: "admin" as const,
      userId,
      ...(revogada
        ? {
            revogadaEm: new Date("2026-10-02T15:00:00Z"),
            revogadaPor: "user_admin",
          }
        : {}),
    });
    await db
      .insert(liberacao)
      .values([
        libera(ESTUDA, { trilhaId }),
        libera(ESTUDA, { cursoId: d }),
        libera(NUNCA, { trilhaId }),
        libera(REVOGADA, { cursoId: d }, true),
        libera(DIRETO, { trilhaId }),
        libera(DIRETO, { cursoId: b }),
      ]);
    // ESTUDA concluiu a, está no meio de d. DIRETO viu a primeira aula de b.
    await db.insert(aulaAssistida).values([
      ...aulas.a.map((aulaId) => ({
        assistidaEm: new Date("2026-10-05T15:00:00Z"),
        aulaId,
        userId: ESTUDA,
      })),
      {
        assistidaEm: new Date("2026-10-06T15:00:00Z"),
        aulaId: aulas.b[0] ?? "",
        userId: DIRETO,
      },
    ]);
    await db.insert(certificado).values({
      codigo: `TESTE-${S}`,
      cursoId: a ?? "",
      emitidoEm: new Date("2026-10-07T15:00:00Z"),
      userId: ESTUDA,
    });
    // 01:00 UTC de 13/10 ainda é 12/10 em São Paulo.
    await db.insert(posicaoAula).values({
      atualizadaEm: new Date("2026-10-13T01:00:00Z"),
      aulaId: aulas.d[0] ?? "",
      posicaoSeg: 120,
      userId: ESTUDA,
    });
  });

  afterAll(async () => {
    await db.delete(posicaoAula).where(inArray(posicaoAula.userId, ALUNOS));
    await db.delete(certificado).where(inArray(certificado.userId, ALUNOS));
    await db.delete(aulaAssistida).where(inArray(aulaAssistida.userId, ALUNOS));
    await db.delete(liberacao).where(inArray(liberacao.userId, ALUNOS));
    await db.delete(trilha).where(inArray(trilha.id, [trilhaId]));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  test("o resumo de cada pessoa sai de um statement e bate com Meus cursos", async () => {
    const busca = montarBusca(
      { pessoas, total: pessoas.length },
      await resumoDasPessoas(db, ALUNOS),
      "2026-10-14" as DiaISO
    );
    expect(busca.pessoas.map((p) => [p.userId, p.resumo])).toEqual([
      [
        ESTUDA,
        {
          numeros: { concluidos: 1, cursos: 3, liberacoes: 2 },
          tipo: "estudando",
          ultimoEstudo: "2026-10-12" as DiaISO,
        },
      ],
      [
        NUNCA,
        {
          desde: "2026-10-01" as DiaISO,
          numeros: { concluidos: 0, cursos: 2, liberacoes: 1 },
          tipo: "nunca_abriu",
        },
      ],
      [
        REVOGADA,
        {
          revogadas: 1,
          tipo: "sem_liberacao",
          ultimaRevogacao: "2026-10-02" as DiaISO,
        },
      ],
      [NADA, { revogadas: 0, tipo: "sem_liberacao", ultimaRevogacao: null }],
      [
        DIRETO,
        {
          numeros: { concluidos: 0, cursos: 2, liberacoes: 2 },
          tipo: "estudando",
          ultimoEstudo: "2026-10-06" as DiaISO,
        },
      ],
    ]);
    // A mesma conta pelo painel do aluno: cursos fora de em_breve, e os concluídos.
    const paineis = await Promise.all(
      busca.pessoas.map((p) => painelDe(p.userId))
    );
    const pelaBusca = busca.pessoas.map((p) =>
      p.resumo.tipo === "sem_liberacao"
        ? { concluidos: 0, cursos: 0 }
        : {
            concluidos: p.resumo.numeros.concluidos,
            cursos: p.resumo.numeros.cursos,
          }
    );
    const pelosPaineis = paineis.map((painel) => {
      const contaveis = [...cursosDoPainel(painel).values()].filter(
        (c) => c.estado.tipo !== "em_breve"
      );
      return {
        concluidos: contaveis.filter((c) => c.estado.tipo === "concluido")
          .length,
        cursos: contaveis.length,
      };
    });
    expect(pelaBusca).toEqual(pelosPaineis);
  });

  test("sem userId, nenhum statement e nenhuma pessoa", async () => {
    expect(await resumoDasPessoas(db, [])).toEqual({
      cursos: [],
      pessoas: [],
      trilhas: [],
    });
  });

  test("o acompanhamento de cada liberação ativa bate com o estado e o progresso de Meus cursos", async () => {
    const comparacoes = await Promise.all(
      [ESTUDA, NUNCA, DIRETO].map(async (userId) => {
        const [acesso, painel] = await Promise.all([
          admin.admin.alunos.acesso({ userId }),
          painelDe(userId),
        ]);
        const doPainel = [...cursosDoPainel(painel).values()];
        // Os títulos levam o sufixo do teste, então identificam o curso.
        const doAdmin = (acesso?.liberacoes ?? []).flatMap<CursoAcompanhado>(
          (l) => {
            const a = l.acompanhamento;
            return a.tipo === "curso" ? [a.curso] : a.cursos;
          }
        );
        const vistos: unknown[] = doAdmin.map((c) => [
          c.titulo,
          c.situacao.tipo,
          c.progresso,
        ]);
        const esperados: unknown[] = doAdmin.map((c) => {
          const p = doPainel.find((x) => x.titulo === c.titulo);
          return [
            c.titulo,
            p ? NA_PALAVRA_DO_ADMIN[p.estado.tipo] : "fora do painel",
            p?.progresso ?? null,
          ];
        });
        return { esperados, userId, vistos };
      })
    );
    for (const { esperados, userId, vistos } of comparacoes) {
      expect([userId, vistos.length > 0]).toEqual([userId, true]);
      expect([userId, vistos]).toEqual([userId, esperados]);
    }
  });

  test("a revogada mostra o estudo que ficou, e a trilha mostra o curso da vez", async () => {
    const estuda = await admin.admin.alunos.acesso({ userId: ESTUDA });
    const daTrilha = estuda?.liberacoes.find((l) => l.alvo.tipo === "trilha");
    expect(daTrilha?.acompanhamento).toMatchObject({
      aulas: { feitas: 2, pct: 50, total: 4 },
      concluidos: 1,
      daVez: 2,
      situacao: "em_curso",
      ultimoEstudo: "2026-10-07",
    });
    const solto = estuda?.liberacoes.find((l) => l.alvo.tipo === "curso");
    expect(solto?.acompanhamento).toMatchObject({
      curso: {
        situacao: {
          onde: { aula: 1, modulo: 1 },
          tipo: "estudando",
          ultimoEstudo: "2026-10-12",
        },
      },
    });
    const revogada = await admin.admin.alunos.acesso({ userId: REVOGADA });
    expect(
      revogada?.liberacoes.map((l) => [l.acao.tipo, l.acompanhamento])
    ).toEqual([
      [
        "revogada",
        {
          curso: {
            progresso: { feitas: 0, pct: 0, total: 2 },
            situacao: { tipo: "nunca_abriu" },
            titulo: `Curso ${S} d`,
          },
          tipo: "curso",
        },
      ],
    ]);
  });
});
