// Consultas contra o Postgres local. Roda só com TEST_DATABASE_URL em host local.
// Cada execução cria alunos user_teste<hex> e slugs teste-<hex> e apaga tudo no afterAll.
// Sem db reset nem TRUNCATE: o banco local é compartilhado entre worktrees.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  aula,
  aulaAssistida,
  comunicado,
  curso,
  liberacao,
  modulo,
  pontoLancamento,
  posicaoAula,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { alunoDeTeste, contextoDeTeste } from "../contexto-de-teste";
import { createCaller } from "../routers/index";
import { categoriaDeTeste, codigoDeTeste } from "./categoria-de-teste";
import { carregarPainel, carregarResumo } from "./meus-cursos";
import {
  carregarPainelDeTroca,
  carregarTemCursoTrocavelNaVitrine,
} from "./troca";

const URL_TESTE = urlDeTeste();
const hex = () => randomBytes(4).toString("hex");
const S = hex();
const ALUNO_A = `user_teste${S}a`;
const ALUNO_B = `user_teste${S}b`;
const ALUNO_VAZIO = `user_teste${S}c`;
const ALUNO_AVISO = `user_teste${S}d`;
const ALUNO_DIRETO = `user_teste${S}e`;
const ALUNO_REVOGADO_DIRETO = `user_teste${S}f`;
const ALUNO_MESMO_INSTANTE = `user_teste${S}h`;
const ALUNO_TROCA = `user_teste${S}i`;
const ALUNO_VITRINE = `user_teste${S}j`;
const ALUNOS = [
  ALUNO_VITRINE,
  ALUNO_A,
  ALUNO_B,
  ALUNO_VAZIO,
  ALUNO_AVISO,
  ALUNO_DIRETO,
  ALUNO_REVOGADO_DIRETO,
  ALUNO_MESMO_INSTANTE,
  ALUNO_TROCA,
];

// quarta-feira, 2026-10-07, 15:00 em São Paulo
const AGORA = new Date("2026-10-07T18:00:00Z");

describe.skipIf(URL_TESTE === null)("consultas de Meus cursos", () => {
  let statements = 0;
  const db = createDb(
    { DATABASE_URL: URL_TESTE ?? "" },
    {
      logger: {
        logQuery: () => {
          statements += 1;
        },
      },
    }
  );
  const cursos: string[] = [];

  /** `n` cursos publicados de 1 módulo e 2 aulas cada. */
  async function criarCursos(n: number) {
    const sufixo = hex();
    const categoriaId = await categoriaDeTeste(db);
    const novos = await db
      .insert(curso)
      .values(
        Array.from({ length: n }, (_, i) => ({
          capaAlt: "Capa de teste",
          capaAltura: 720,
          capaLargura: 1280,
          capaUrl: "/capas/teste.jpg",
          categoriaId,
          codigo: codigoDeTeste(),
          slug: `teste-${sufixo}-${i}`,
          status: "publicado" as const,
          titulo: `Curso ${i}`,
        }))
      )
      .returning({ id: curso.id });
    cursos.push(...novos.map((c) => c.id));
    const modulos = await db
      .insert(modulo)
      .values(
        novos.map((c) => ({ cursoId: c.id, numero: 1, titulo: "Módulo" }))
      )
      .returning({ id: modulo.id });
    const aulas = await db
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
      .returning({ id: aula.id, moduloId: aula.moduloId });
    return {
      aulas: aulas.map((a) => a.id),
      cursos: novos.map((c) => c.id),
    };
  }

  /** Uma liberação ativa por curso. */
  const liberar = (userId: string, ids: readonly string[]) =>
    db.insert(liberacao).values(
      ids.map((cursoId) => ({
        cursoId,
        liberadaPor: "user_admin",
        origem: "admin" as const,
        userId,
      }))
    );

  /** Liberação de um curso só, ativa ou já revogada. */
  const liberarCurso = (userId: string, cursoId: string, revogada = false) =>
    db.insert(liberacao).values({
      cursoId,
      liberadaPor: "user_admin",
      origem: "admin",
      userId,
      ...(revogada ? revogacao() : {}),
    });

  const revogacao = () => ({
    liberadaEm: new Date(Date.now() - 60_000),
    revogadaEm: new Date(),
    revogadaPor: "user_admin",
  });

  const publicar = (
    cursoId: string | undefined,
    quando: string,
    titulo: string
  ) =>
    db.insert(comunicado).values({
      cursoId,
      publicadoEm: new Date(quando),
      publicadoPor: "user_admin",
      texto: "teste",
      titulo,
    });

  const comoAluno = (userId: string | null) =>
    createCaller(contextoDeTeste({ db, userId }));

  let pequena: Awaited<ReturnType<typeof criarCursos>>;
  const idsDe = (painel: { cursos: readonly { id: string }[] }) =>
    painel.cursos.map((c) => String(c.id));
  const doPequeno = (painel: {
    cursos: readonly { id: string; progresso: unknown; estado: unknown }[];
  }) => painel.cursos.find((c) => c.id === pequena.cursos[0]);

  beforeAll(async () => {
    pequena = await criarCursos(1);
  });

  afterAll(async () => {
    await db
      .delete(pontoLancamento)
      .where(inArray(pontoLancamento.userId, ALUNOS));
    await db.delete(posicaoAula).where(inArray(posicaoAula.userId, ALUNOS));
    await db.delete(aulaAssistida).where(inArray(aulaAssistida.userId, ALUNOS));
    await db.delete(liberacao).where(inArray(liberacao.userId, ALUNOS));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  test("sem login, painel e resumo lançam UNAUTHORIZED", async () => {
    const anonimo = comoAluno(null);
    const erros = await Promise.all(
      [anonimo.meusCursos.painel(), anonimo.aluno.resumo()].map((chamada) =>
        chamada.catch((e: unknown) => e)
      )
    );
    for (const erro of erros) {
      expect(erro).toBeInstanceOf(TRPCError);
      expect((erro as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  test("aluno sem liberação recebe painel vazio e retomada nula", async () => {
    const painel = await comoAluno(ALUNO_VAZIO).meusCursos.painel();
    expect(painel.cursos).toEqual([]);
    expect(painel.retomada).toBeNull();
  });

  test("aluno B não vê curso liberado só para o aluno A", async () => {
    await liberar(ALUNO_A, pequena.cursos);
    const a = await comoAluno(ALUNO_A).meusCursos.painel();
    const b = await comoAluno(ALUNO_B).meusCursos.painel();
    expect(idsDe(a)).toContain(pequena.cursos[0] ?? "");
    expect(idsDe(b)).not.toContain(pequena.cursos[0] ?? "");
  });

  test("liberação revogada tira o curso do painel, e liberar de novo devolve o progresso", async () => {
    const [primeira] = pequena.aulas;
    await db
      .insert(aulaAssistida)
      .values({ aulaId: primeira ?? "", userId: ALUNO_A });
    const antes = await carregarPainel(db, alunoDeTeste(ALUNO_A), AGORA);
    expect(doPequeno(antes)?.progresso).toEqual({
      feitas: 1,
      pct: 50,
      total: 2,
    });

    await db
      .update(liberacao)
      .set({ revogadaEm: new Date(), revogadaPor: "user_admin" })
      .where(and(eq(liberacao.userId, ALUNO_A), isNull(liberacao.revogadaEm)));
    const revogado = await carregarPainel(db, alunoDeTeste(ALUNO_A), AGORA);
    expect(idsDe(revogado)).not.toContain(pequena.cursos[0] ?? "");

    await liberar(ALUNO_A, pequena.cursos);
    const deNovo = await carregarPainel(db, alunoDeTeste(ALUNO_A), AGORA);
    expect(doPequeno(deNovo)?.progresso).toEqual({
      feitas: 1,
      pct: 50,
      total: 2,
    });
  });

  test("aula assistida e posição de outro aluno não entram", async () => {
    await liberar(ALUNO_B, pequena.cursos);
    const [, segunda] = pequena.aulas;
    await db
      .insert(posicaoAula)
      .values({ aulaId: segunda ?? "", posicaoSeg: 120, userId: ALUNO_A });
    const b = await carregarPainel(db, alunoDeTeste(ALUNO_B), AGORA);
    expect(doPequeno(b)).toMatchObject({
      estado: { tipo: "nao_iniciado" },
      progresso: { feitas: 0 },
    });
    expect(b.retomada?.tipo).toBe("comecar");
  });

  test("saldo é a soma do livro-razão e a semana começa na segunda 00:00 de São Paulo", async () => {
    const [primeira, segunda] = pequena.aulas;
    // A aula 1 já foi assistida pelo aluno A no teste da revogação.
    await db
      .insert(aulaAssistida)
      .values({ aulaId: segunda ?? "", userId: ALUNO_A });
    await db.insert(pontoLancamento).values([
      // domingo 23:59 em São Paulo: semana anterior
      {
        aulaId: primeira,
        criadoEm: new Date("2026-10-05T02:59:00Z"),
        motivo: "aula_assistida",
        pontos: 10,
        userId: ALUNO_A,
      },
      // segunda 00:00 em São Paulo: esta semana
      {
        aulaId: segunda,
        criadoEm: new Date("2026-10-05T03:00:00Z"),
        motivo: "aula_assistida",
        pontos: 10,
        userId: ALUNO_A,
      },
      {
        criadoEm: new Date("2026-10-06T15:00:00Z"),
        diaMarco: "2026-10-06",
        motivo: "sequencia_7_dias",
        pontos: 30,
        userId: ALUNO_A,
      },
    ]);
    const resumo = await carregarResumo(db, ALUNO_A, AGORA);
    expect(resumo.saldo).toBe(50);
    expect(resumo.pontosSemana).toBe(40);
  });

  test("troca nesta semana baixa o saldo e não baixa os pontos da semana", async () => {
    const t = await criarCursos(1);
    const [aulaId] = t.aulas;
    const [cursoId] = t.cursos;
    await db
      .insert(aulaAssistida)
      .values({ aulaId: aulaId ?? "", userId: ALUNO_TROCA });
    const [lib] = await db
      .insert(liberacao)
      .values({
        cursoId: cursoId ?? "",
        liberadaPor: ALUNO_TROCA,
        origem: "troca",
        userId: ALUNO_TROCA,
      })
      .returning({ id: liberacao.id });
    await db.insert(pontoLancamento).values([
      {
        aulaId,
        criadoEm: new Date("2026-10-06T15:00:00Z"),
        motivo: "aula_assistida",
        pontos: 10,
        userId: ALUNO_TROCA,
      },
      {
        criadoEm: new Date("2026-10-06T15:00:00Z"),
        diaMarco: "2026-10-06",
        motivo: "sequencia_7_dias",
        pontos: 30,
        userId: ALUNO_TROCA,
      },
      {
        criadoEm: new Date("2026-10-07T12:00:00Z"),
        liberacaoId: lib?.id,
        motivo: "troca",
        pontos: -25,
        userId: ALUNO_TROCA,
      },
    ]);
    const resumo = await carregarResumo(db, ALUNO_TROCA, AGORA);
    expect({ saldo: resumo.saldo, semana: resumo.pontosSemana }).toEqual({
      saldo: 15,
      semana: 40,
    });
  });

  test("comunicado do curso liberado aparece mesmo com 20 mais novos de cursos fora do alcance", async () => {
    const minha = await criarCursos(1);
    const alheia = await criarCursos(1);
    await liberar(ALUNO_AVISO, minha.cursos);
    // Datas no futuro para ficar à frente de qualquer comunicado geral do banco local.
    // O cascade do curso apaga os comunicados no afterAll.
    const base = Date.parse("2090-01-01T00:00:00Z");
    await db.insert(comunicado).values({
      cursoId: minha.cursos[0],
      publicadoEm: new Date(base),
      publicadoPor: "user_admin",
      texto: "teste",
      titulo: `Aviso do meu curso ${S}`,
    });
    await db.insert(comunicado).values(
      Array.from({ length: 20 }, (_, i) => ({
        cursoId: alheia.cursos[0],
        publicadoEm: new Date(base + (i + 1) * 60_000),
        publicadoPor: "user_admin",
        texto: "teste",
        titulo: `Aviso alheio ${i}`,
      }))
    );
    const painel = await carregarPainel(db, alunoDeTeste(ALUNO_AVISO), AGORA);
    expect(painel.comunicado?.titulo).toBe(`Aviso do meu curso ${S}`);
  });

  // Nos dois testes abaixo, as datas no futuro deixam os comunicados à frente de
  // qualquer comunicado geral do banco local.
  test("comunicado de curso liberado aparece", async () => {
    const {
      cursos: [liberado],
    } = await criarCursos(1);
    await liberarCurso(ALUNO_DIRETO, liberado ?? "");
    await publicar(liberado, "2091-01-01T00:00:00Z", `Aviso direto ${S}`);
    const painel = await carregarPainel(db, alunoDeTeste(ALUNO_DIRETO), AGORA);
    expect(painel.comunicado?.titulo).toBe(`Aviso direto ${S}`);
  });

  test("comunicado de curso com liberação revogada não aparece nem toma o limit 1", async () => {
    const liberada = await criarCursos(1);
    const {
      cursos: [revogado],
    } = await criarCursos(1);
    await liberar(ALUNO_REVOGADO_DIRETO, liberada.cursos);
    await liberarCurso(ALUNO_REVOGADO_DIRETO, revogado ?? "", true);
    await publicar(liberada.cursos[0], "2092-01-01T00:00:00Z", `Visível ${S}`);
    await publicar(revogado, "2092-01-02T00:00:00Z", `Revogado ${S}`);
    const painel = await carregarPainel(
      db,
      alunoDeTeste(ALUNO_REVOGADO_DIRETO),
      AGORA
    );
    expect(painel.comunicado?.titulo).toBe(`Visível ${S}`);
  });

  test("duas liberações no mesmo instante saem na ordem do id (item 25)", async () => {
    const {
      cursos: [um, dois],
    } = await criarCursos(2);
    const [menor, maior] = [crypto.randomUUID(), crypto.randomUUID()].sort();
    await db.insert(liberacao).values([
      {
        cursoId: dois ?? "",
        id: maior,
        liberadaPor: "user_admin",
        origem: "admin",
        userId: ALUNO_MESMO_INSTANTE,
      },
      {
        cursoId: um ?? "",
        id: menor,
        liberadaPor: "user_admin",
        origem: "admin",
        userId: ALUNO_MESMO_INSTANTE,
      },
    ]);
    const painel = await carregarPainel(
      db,
      alunoDeTeste(ALUNO_MESMO_INSTANTE),
      AGORA
    );
    expect(idsDe(painel)).toEqual([um ?? "", dois ?? ""]);
  });

  // O banco local é compartilhado e tem cursos com preço do seed. Para o false
  // aparecer, o aluno alcança todo curso com preço numa transação em repeatable
  // read (curso com preço criado por outro teste no meio não entra no retrato),
  // e o rollback desfaz tudo. Os quatro passos mudam o valor, então uma resposta
  // fixa não passa.
  test("Sua semana e Trocar pontos leem o mesmo curso trocável na vitrine", async () => {
    const {
      cursos: [trocavel],
    } = await criarCursos(1);
    if (!trocavel) {
      throw new Error("curso não criado");
    }
    await db
      .update(curso)
      .set({ precoTroca: 300 })
      .where(eq(curso.id, trocavel));
    expect({
      semana: await carregarTemCursoTrocavelNaVitrine(
        db,
        alunoDeTeste(ALUNO_VITRINE)
      ),
      troca: (
        await carregarPainelDeTroca(db, alunoDeTeste(ALUNO_VITRINE), AGORA)
      ).temCursoTrocavelNaVitrine,
    }).toEqual({ semana: true, troca: true });
    class Desfazer extends Error {}
    const vistos: boolean[] = [];
    const desfeito = await db
      .transaction(
        async (tx) => {
          const fato = async () => {
            vistos.push(
              await carregarTemCursoTrocavelNaVitrine(
                tx,
                alunoDeTeste(ALUNO_VITRINE)
              )
            );
          };
          await fato();
          const comPreco = await tx
            .select({ id: curso.id })
            .from(curso)
            .where(isNotNull(curso.precoTroca));
          await tx.insert(liberacao).values(
            comPreco.map((c) => ({
              cursoId: c.id,
              liberadaPor: "user_admin",
              origem: "admin" as const,
              userId: ALUNO_VITRINE,
            }))
          );
          await fato();
          await tx
            .update(liberacao)
            .set({ revogadaEm: sql`now()`, revogadaPor: "user_admin" })
            .where(
              and(
                eq(liberacao.userId, ALUNO_VITRINE),
                eq(liberacao.cursoId, trocavel)
              )
            );
          await fato();
          await tx.insert(liberacao).values({
            cursoId: trocavel,
            liberadaPor: "user_admin",
            origem: "admin",
            userId: ALUNO_VITRINE,
          });
          await fato();
          throw new Desfazer();
        },
        { isolationLevel: "repeatable read" }
      )
      .catch((e: unknown) => {
        if (e instanceof Desfazer) {
          return true;
        }
        throw e;
      });
    expect(desfeito).toBe(true);
    expect(vistos).toEqual([
      // o curso novo está à venda
      true,
      // liberação de todo curso com preço: nada à venda
      false,
      // revogada a do curso novo, ele volta à venda
      true,
      // liberado de novo, ele sai da venda
      false,
    ]);
  });

  test("Sua semana lê a vitrine num statement, fora do resumo", async () => {
    statements = 0;
    await carregarTemCursoTrocavelNaVitrine(db, alunoDeTeste(ALUNO_A));
    expect(statements).toBe(1);
  });

  // O resumo alimenta o placar da casca, que roda em toda página do aluno e do
  // admin. A vitrine fica fora dele.
  test("painel faz 6 statements e resumo 2, com 1 e com 40 cursos", async () => {
    const grande = await criarCursos(40);
    await liberar(ALUNO_B, grande.cursos);
    const contar = async (f: () => Promise<unknown>) => {
      statements = 0;
      await f();
      return statements;
    };
    const comUm = {
      painel: await contar(() =>
        carregarPainel(db, alunoDeTeste(ALUNO_A), AGORA)
      ),
      resumo: await contar(() => carregarResumo(db, ALUNO_A, AGORA)),
    };
    const comQuarenta = {
      painel: await contar(() =>
        carregarPainel(db, alunoDeTeste(ALUNO_B), AGORA)
      ),
      resumo: await contar(() => carregarResumo(db, ALUNO_B, AGORA)),
    };
    const painelB = await carregarPainel(db, alunoDeTeste(ALUNO_B), AGORA);
    const doGrande = new Set(grande.cursos);
    expect(painelB.cursos.filter((c) => doGrande.has(c.id))).toHaveLength(40);
    expect(comUm).toEqual({ painel: 6, resumo: 2 });
    expect(comQuarenta).toEqual({ painel: 6, resumo: 2 });
  });
});
