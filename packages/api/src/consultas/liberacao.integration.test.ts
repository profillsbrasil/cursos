import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { setTimeout as esperar } from "node:timers/promises";
import { createDb } from "@cursos/db";
import {
  aula,
  curso,
  liberacao,
  modulo,
  pontoLancamento,
  trilha,
  trilhaCurso,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { eq, inArray, sql } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import type {
  AdminId,
  CursoId,
  LiberacaoId,
  Pessoa,
  TrilhaId,
} from "../dominio/tipos";
import { createCaller } from "../routers/index";
import { liberar, revogar } from "./liberacao";
import { trocar } from "./troca";

const URL_TESTE = urlDeTeste();
const hex = () => randomBytes(4).toString("hex");
const S = hex();
const AGORA = new Date("2026-10-07T18:00:00Z");
const ADMIN = "user_admin" as AdminId;
const pessoa = (userId: string): Pessoa => ({
  email: null,
  foto: null,
  nome: "Aluno",
  userId,
});

describe.skipIf(URL_TESTE === null)("liberação pelo admin", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const alunos: string[] = [];
  const cursos: string[] = [];
  const trilhas: string[] = [];

  async function aluno(saldo = 0) {
    const userId = `user_lib${S}${alunos.length}`;
    alunos.push(userId);
    if (saldo > 0) {
      await db.insert(pontoLancamento).values(
        Array.from({ length: saldo / 10 }, (_, i) => ({
          criadoEm: new Date(Date.UTC(2026, 0, 1 + i, 15)),
          diaMarco: new Date(Date.UTC(2026, 0, 1 + i))
            .toISOString()
            .slice(0, 10),
          motivo: "sequencia_7_dias" as const,
          pontos: 10,
          userId,
        }))
      );
    }
    return userId;
  }

  async function cursoTrocavel(precoTroca: number) {
    const s = hex();
    const [c] = await db
      .insert(curso)
      .values({
        capaAlt: "Capa de teste",
        capaAltura: 720,
        capaLargura: 1280,
        capaUrl: "/capas/teste.jpg",
        precoTroca,
        slug: `teste-${s}`,
        status: "publicado",
        tema: "teste",
        titulo: `Curso ${s}`,
      })
      .returning({ id: curso.id });
    if (!c) {
      throw new Error("curso não criado");
    }
    cursos.push(c.id);
    const [m] = await db
      .insert(modulo)
      .values({ cursoId: c.id, numero: 1, titulo: "Módulo" })
      .returning({ id: modulo.id });
    await db.insert(aula).values({
      duracaoSeg: 600,
      moduloId: m?.id ?? "",
      posicao: 1,
      titulo: "Aula",
    });
    return c.id as CursoId;
  }

  async function trilhaCom(...cursosDaTrilha: CursoId[]) {
    const [t] = await db
      .insert(trilha)
      .values({ descricao: "teste", slug: `teste-${hex()}`, titulo: "Trilha" })
      .returning({ id: trilha.id });
    if (!t) {
      throw new Error("trilha não criada");
    }
    trilhas.push(t.id);
    if (cursosDaTrilha.length > 0) {
      await db.insert(trilhaCurso).values(
        cursosDaTrilha.map((cursoId, i) => ({
          cursoId,
          posicao: i + 1,
          trilhaId: t.id,
        }))
      );
    }
    return t.id as TrilhaId;
  }

  const saldoDe = async (userId: string) => {
    const [r] = await db
      .select({
        s: sql<number>`coalesce(sum(${pontoLancamento.pontos}), 0)::int`,
      })
      .from(pontoLancamento)
      .where(eq(pontoLancamento.userId, userId));
    return r?.s;
  };

  const liberacoesDe = (userId: string) =>
    db
      .select({
        cursoId: liberacao.cursoId,
        id: liberacao.id,
        liberadaEm: liberacao.liberadaEm,
        origem: liberacao.origem,
        revogadaEm: liberacao.revogadaEm,
        revogadaPor: liberacao.revogadaPor,
        trilhaId: liberacao.trilhaId,
      })
      .from(liberacao)
      .where(eq(liberacao.userId, userId));

  /**
   * Segura um SHARE lock em liberacao numa transação à parte: todo INSERT em
   * liberacao espera até soltar(). Assim cada lado da corrida para num ponto
   * conhecido, sem mexer no código que se testa.
   */
  async function seguraOsInserts() {
    let soltar: () => void = () => undefined;
    const portao = new Promise<void>((r) => {
      soltar = r;
    });
    let travou: () => void = () => undefined;
    const travada = new Promise<void>((r) => {
      travou = r;
    });
    const transacao = db.transaction(async (tx) => {
      await tx.execute(sql`lock table liberacao in share mode`);
      travou();
      await portao;
    });
    await travada;
    return async () => {
      soltar();
      await transacao;
    };
  }

  /**
   * Espera até `n` statements desta suíte pararem em lock e devolve o tipo de
   * espera de cada um: 'advisory' é a trava do aluno, 'relation' é o INSERT ou
   * o UPDATE parado no SHARE lock.
   */
  async function esperas(n: number, tentativas = 150): Promise<string[]> {
    const { rows } = await db.execute<{ e: string }>(sql`
      select wait_event as e from pg_stat_activity
      where datname = current_database() and wait_event_type = 'Lock'
        and (query like 'insert into "liberacao"%'
          or query like 'update "liberacao"%'
          or query like 'select pg_advisory_xact_lock%')`);
    if (rows.length >= n) {
      return rows.map((r) => r.e).sort();
    }
    if (tentativas === 0) {
      throw new Error(`Só ${rows.length} de ${n} statements pararam em lock.`);
    }
    await esperar(20);
    return esperas(n, tentativas - 1);
  }

  const resultado = (r: PromiseSettledResult<unknown>) =>
    r.status === "rejected" && r.reason instanceof TRPCError
      ? r.reason.code
      : r.status;

  afterAll(async () => {
    await db
      .delete(pontoLancamento)
      .where(inArray(pontoLancamento.userId, alunos));
    await db.delete(liberacao).where(inArray(liberacao.userId, alunos));
    await db.delete(trilha).where(inArray(trilha.id, trilhas));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  test("trilha liberada antes da troca: a troca espera a trava, vê a trilha e não debita", async () => {
    const userId = await aluno(300);
    const c = await cursoTrocavel(300);
    const t = await trilhaCom(c);
    const soltar = await seguraOsInserts();
    const admin = liberar(
      db,
      ADMIN,
      pessoa(userId),
      { id: t, tipo: "trilha", trocadosVistos: [] },
      AGORA
    );
    await esperas(1);
    const troca = trocar(db, userId, c, 300, AGORA);
    const paradas = await esperas(2);
    await soltar();
    const [r, rTroca] = await Promise.allSettled([admin, troca]);
    expect({
      admin: resultado(r),
      paradas,
      saldo: await saldoDe(userId),
      troca: resultado(rTroca),
    }).toEqual({
      admin: "fulfilled",
      paradas: ["advisory", "relation"],
      saldo: 300,
      troca: "CONFLICT",
    });
  });

  test("troca antes da trilha: a liberação espera a troca, vê que a tela ficou velha e recusa", async () => {
    const userId = await aluno(300);
    const c = await cursoTrocavel(300);
    const t = await trilhaCom(c);
    const soltar = await seguraOsInserts();
    const troca = trocar(db, userId, c, 300, AGORA);
    await esperas(1);
    const admin = liberar(
      db,
      ADMIN,
      pessoa(userId),
      { id: t, tipo: "trilha", trocadosVistos: [] },
      AGORA
    );
    const paradas = await esperas(2);
    await soltar();
    const [rTroca, r] = await Promise.allSettled([troca, admin]);
    const ativas = (await liberacoesDe(userId)).filter((l) => !l.revogadaEm);
    expect({
      admin: resultado(r),
      ativas: ativas.map((l) => l.origem).sort(),
      paradas,
      saldo: await saldoDe(userId),
      troca: resultado(rTroca),
    }).toEqual({
      admin: "CONFLICT",
      ativas: ["troca"],
      paradas: ["advisory", "relation"],
      saldo: 0,
      troca: "fulfilled",
    });
  });

  test("trilha com curso trocado: libera só quando a tela mostrou a troca, e as duas ficam", async () => {
    const userId = await aluno(300);
    const c = await cursoTrocavel(300);
    const t = await trilhaCom(c);
    await trocar(db, userId, c, 300, AGORA);
    const semAviso = await liberar(
      db,
      ADMIN,
      pessoa(userId),
      { id: t, tipo: "trilha", trocadosVistos: [] },
      AGORA
    ).catch((e: unknown) => e);
    expect(semAviso).toMatchObject({ code: "CONFLICT" });
    expect((await liberacoesDe(userId)).map((l) => l.origem).sort()).toEqual([
      "troca",
    ]);
    const comAviso = await liberar(
      db,
      ADMIN,
      pessoa(userId),
      { id: t, tipo: "trilha", trocadosVistos: [c] },
      AGORA
    );
    expect(comAviso.nova).toBe(true);
    expect((await liberacoesDe(userId)).map((l) => l.origem).sort()).toEqual([
      "admin",
      "troca",
    ]);
  });

  test("revogar antes de liberar: a liberação espera a revogação e grava uma nova", async () => {
    const userId = await aluno();
    const t = await trilhaCom();
    const alvo = { id: t, tipo: "trilha", trocadosVistos: [] } as const;
    const { liberacaoId } = await liberar(
      db,
      ADMIN,
      pessoa(userId),
      alvo,
      AGORA
    );
    const soltar = await seguraOsInserts();
    const revogacao = revogar(db, ADMIN, liberacaoId, AGORA);
    await esperas(1);
    const liberacaoNova = liberar(db, ADMIN, pessoa(userId), alvo, AGORA);
    const paradas = await Promise.race([
      liberacaoNova.then(() => "a liberação não esperou"),
      esperas(2).catch(() => "a liberação não parou"),
    ]);
    await soltar();
    const [rRevogar, rLiberar] = await Promise.all([revogacao, liberacaoNova]);
    expect({
      ativas: (await liberacoesDe(userId)).filter((l) => !l.revogadaEm).length,
      liberar: rLiberar.nova,
      paradas,
      revogar: rRevogar,
    }).toEqual({
      ativas: 1,
      liberar: true,
      paradas: ["advisory", "relation"],
      revogar: { revogada: true },
    });
  });

  test("liberar duas vezes, em série ou em paralelo, grava uma linha", async () => {
    const userId = await aluno();
    const t = await trilhaCom();
    const alvo = { id: t, tipo: "trilha", trocadosVistos: [] } as const;
    const [a, b] = await Promise.all([
      liberar(db, ADMIN, pessoa(userId), alvo, AGORA),
      liberar(db, ADMIN, pessoa(userId), alvo, AGORA),
    ]);
    const c = await liberar(db, ADMIN, pessoa(userId), alvo, AGORA);
    expect([a.nova, b.nova].sort()).toEqual([false, true]);
    expect(c).toEqual({ liberacaoId: a.liberacaoId, nova: false });
    expect(await liberacoesDe(userId)).toHaveLength(1);
  });

  test("revogar duas vezes muda a linha uma vez", async () => {
    const userId = await aluno();
    const t = await trilhaCom();
    const { liberacaoId } = await liberar(
      db,
      ADMIN,
      pessoa(userId),
      { id: t, tipo: "trilha", trocadosVistos: [] },
      AGORA
    );
    const depois = new Date(AGORA.getTime() + 60_000);
    const primeira = await revogar(db, ADMIN, liberacaoId, depois);
    const segunda = await revogar(
      db,
      "user_outro" as AdminId,
      liberacaoId,
      new Date(AGORA.getTime() + 120_000)
    );
    expect([primeira, segunda]).toEqual([
      { revogada: true },
      { revogada: false },
    ]);
    expect(await liberacoesDe(userId)).toMatchObject([
      { revogadaEm: depois, revogadaPor: ADMIN },
    ]);
  });

  test("revogar com o relógio do app antes de liberada_em grava liberada_em", async () => {
    const userId = await aluno();
    const t = await trilhaCom();
    const { liberacaoId } = await liberar(
      db,
      ADMIN,
      pessoa(userId),
      { id: t, tipo: "trilha", trocadosVistos: [] },
      AGORA
    );
    const atrasado = new Date(AGORA.getTime() - 2000);
    expect(await revogar(db, ADMIN, liberacaoId, atrasado)).toEqual({
      revogada: true,
    });
    expect(await liberacoesDe(userId)).toMatchObject([
      { liberadaEm: AGORA, revogadaEm: AGORA },
    ]);
  });

  test("revogar troca é recusado e a liberação continua ativa", async () => {
    const userId = await aluno(300);
    const c = await cursoTrocavel(300);
    await trocar(db, userId, c, 300, AGORA);
    const [troca] = await liberacoesDe(userId);
    const erro = await revogar(
      db,
      ADMIN,
      troca?.id as LiberacaoId,
      AGORA
    ).catch((e: unknown) => e);
    expect(erro).toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(await liberacoesDe(userId)).toMatchObject([
      { origem: "troca", revogadaEm: null },
    ]);
  });

  test("revogar id que não existe dá NOT_FOUND", async () => {
    const erro = await revogar(
      db,
      ADMIN,
      crypto.randomUUID() as LiberacaoId,
      AGORA
    ).catch((e: unknown) => e);
    expect(erro).toMatchObject({ code: "NOT_FOUND" });
  });

  test("o admin libera para si mesmo pela API e revoga", async () => {
    const dono = await aluno();
    const t = await trilhaCom();
    const admin = createCaller(
      contextoDeTeste({
        db,
        papel: "admin",
        pessoas: [{ email: null, foto: null, nome: "Dono", userId: dono }],
        userId: dono,
      })
    );
    const { liberacaoId } = await admin.admin.alunos.liberar({
      alvo: { id: t, tipo: "trilha", trocadosVistos: [] },
      userId: dono,
    });
    const acesso = await admin.admin.alunos.acesso({ userId: dono });
    expect(acesso?.liberacoes.map((l) => [l.id, l.acao.tipo])).toEqual([
      [liberacaoId, "revogar"],
    ]);
    await admin.admin.alunos.revogar({ liberacaoId });
    expect(await liberacoesDe(dono)).toMatchObject([
      { origem: "admin", revogadaPor: dono },
    ]);
  });

  test("liberar para quem o Clerk não conhece dá NOT_FOUND e não grava", async () => {
    const sumiu = await aluno();
    const t = await trilhaCom();
    const admin = createCaller(
      contextoDeTeste({ db, papel: "admin", userId: "user_dono" })
    );
    const erro = await admin.admin.alunos
      .liberar({
        alvo: { id: t, tipo: "trilha", trocadosVistos: [] },
        userId: sumiu,
      })
      .catch((e: unknown) => e);
    expect(erro).toMatchObject({ code: "NOT_FOUND" });
    expect(await liberacoesDe(sumiu)).toHaveLength(0);
  });
});
