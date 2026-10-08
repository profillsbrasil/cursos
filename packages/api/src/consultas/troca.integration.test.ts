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

import type { CursoId } from "../dominio/tipos";
import { createCaller } from "../routers/index";
import { carregarPainelDeTroca, trocar } from "./troca";

const URL_TESTE = urlDeTeste();
const hex = () => randomBytes(4).toString("hex");
const S = hex();
const AGORA = new Date("2026-10-07T18:00:00Z");

describe.skipIf(URL_TESTE === null)("troca de pontos", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const alunos: string[] = [];
  const cursos: string[] = [];
  const trilhas: string[] = [];

  async function aluno(saldo: number) {
    const userId = `user_teste${S}${alunos.length}`;
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

  async function cursoTrocavel(precoTroca: number | null, titulo = "Curso") {
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
        titulo: `${titulo} ${s}`,
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

  const saldoDe = async (userId: string) => {
    const [r] = await db
      .select({
        s: sql<number>`coalesce(sum(${pontoLancamento.pontos}), 0)::int`,
      })
      .from(pontoLancamento)
      .where(eq(pontoLancamento.userId, userId));
    return r?.s;
  };

  const trocasDe = (userId: string) =>
    db
      .select({ id: pontoLancamento.id })
      .from(pontoLancamento)
      .where(
        sql`${pontoLancamento.userId} = ${userId} and ${pontoLancamento.motivo} = 'troca'`
      );

  async function esperarInsertBloqueado(tentativas: number): Promise<void> {
    const { rows } = await db.execute<{ n: number }>(sql`
      select count(*)::int as n from pg_stat_activity
      where wait_event_type = 'Lock' and query like 'insert into "liberacao"%'`);
    if (rows[0]?.n) {
      return;
    }
    if (tentativas === 0) {
      throw new Error("O insert da troca não chegou a esperar o admin.");
    }
    await esperar(20);
    return esperarInsertBloqueado(tentativas - 1);
  }

  const codigo = (r: PromiseSettledResult<unknown>) =>
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

  test("troca debita o preço, libera o curso e aparece no painel e no extrato", async () => {
    const userId = await aluno(500);
    const c = await cursoTrocavel(300, "Troca feita");
    const r = await createCaller({ auth: { userId }, db }).troca.trocar({
      cursoId: c,
      precoVisto: 300,
    });
    expect(await trocasDe(userId)).toEqual([{ id: r.lancamentoId }]);
    const painel = await carregarPainelDeTroca(db, userId, AGORA);
    expect(painel.saldo).toBe(200);
    expect(painel.cartoes.find((x) => x.curso.id === c)).toMatchObject({
      pago: 300,
      tipo: "trocado",
    });
    const [trocado] = await db
      .select({ titulo: curso.titulo })
      .from(curso)
      .where(eq(curso.id, c));
    expect(painel.extrato[0]).toMatchObject({
      id: r.lancamentoId,
      pontos: -300,
      texto: `Troca: ${trocado?.titulo}`,
    });
    const [lib] = await db
      .select({ por: liberacao.liberadaPor })
      .from(liberacao)
      .where(eq(liberacao.userId, userId));
    expect(lib?.por).toBe(userId);
  });

  test("curso trocado continua na vitrine de quem trocou depois de o admin tirar o preço", async () => {
    const quemTrocou = await aluno(500);
    const outro = await aluno(500);
    const c = await cursoTrocavel(300);
    await trocar(db, quemTrocou, c, 300, AGORA);
    const cardDe = async (userId: string) =>
      (await carregarPainelDeTroca(db, userId, AGORA)).cartoes.find(
        (x) => x.curso.id === c
      );
    expect(await cardDe(outro)).toMatchObject({ tipo: "pode_trocar" });
    await db.update(curso).set({ precoTroca: null }).where(eq(curso.id, c));
    expect(await cardDe(quemTrocou)).toMatchObject({
      pago: 300,
      tipo: "trocado",
    });
    expect(await cardDe(outro)).toBeUndefined();
  });

  test("dois cursos em paralelo com saldo para um: uma troca, uma recusa, saldo nunca negativo (20 vezes)", async () => {
    const rodadas: { codigos: string[]; saldo: number | undefined }[] = [];
    for (let i = 0; i < 20; i += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: cada rodada é uma corrida isolada
      const userId = await aluno(300);
      const [a, b] = await Promise.all([
        cursoTrocavel(300),
        cursoTrocavel(300),
      ]);
      const r = await Promise.allSettled([
        trocar(db, userId, a, 300, AGORA),
        trocar(db, userId, b, 300, AGORA),
      ]);
      rodadas.push({
        codigos: r.map(codigo).map(String).sort(),
        saldo: await saldoDe(userId),
      });
    }
    expect(rodadas).toEqual(
      Array.from({ length: 20 }, () => ({
        codigos: ["PRECONDITION_FAILED", "fulfilled"],
        saldo: 0,
      }))
    );
  });

  test("duplo clique no mesmo curso: um lançamento, e o segundo devolve a mesma troca", async () => {
    const userId = await aluno(300);
    const c = await cursoTrocavel(300);
    const [um, dois] = await Promise.all([
      trocar(db, userId, c, 300, AGORA),
      trocar(db, userId, c, 300, AGORA),
    ]);
    expect(um.lancamentoId).toBe(dois.lancamentoId);
    expect(await trocasDe(userId)).toHaveLength(1);
    expect(await saldoDe(userId)).toBe(0);
  });

  test("retry depois do commit devolve a mesma troca e não debita de novo", async () => {
    const userId = await aluno(600);
    const c = await cursoTrocavel(300);
    const primeira = await trocar(db, userId, c, 300, AGORA);
    const retry = await trocar(db, userId, c, 300, AGORA);
    expect(retry).toEqual(primeira);
    expect(await trocasDe(userId)).toHaveLength(1);
    expect(await saldoDe(userId)).toBe(300);
  });

  test("admin libera o curso no meio da troca: a troca vira CONFLICT e nada é debitado", async () => {
    const userId = await aluno(300);
    const c = await cursoTrocavel(300);
    let commitDoAdmin: () => void = () => undefined;
    const portao = new Promise<void>((r) => {
      commitDoAdmin = r;
    });
    let adminInseriu: () => void = () => undefined;
    const inseriu = new Promise<void>((r) => {
      adminInseriu = r;
    });
    const admin = db.transaction(async (tx) => {
      await tx.insert(liberacao).values({
        cursoId: c,
        liberadaPor: "user_admin",
        origem: "admin",
        userId,
      });
      adminInseriu();
      await portao;
    });
    await inseriu;
    const troca = trocar(db, userId, c, 300, AGORA).catch((e: unknown) => e);
    await esperarInsertBloqueado(100);
    commitDoAdmin();
    await admin;
    expect(await troca).toMatchObject({
      code: "CONFLICT",
      message: "Você já tem este curso. Ele está em Meus cursos.",
    });
    expect(await saldoDe(userId)).toBe(300);
    expect(await trocasDe(userId)).toHaveLength(0);
  });

  test("preço mudou desde que a tela abriu: CONFLICT com o preço novo", async () => {
    const userId = await aluno(1000);
    const c = await cursoTrocavel(300);
    await db.update(curso).set({ precoTroca: 450 }).where(eq(curso.id, c));
    const erro = await trocar(db, userId, c, 300, AGORA).catch(
      (e: unknown) => e
    );
    expect(erro).toMatchObject({
      code: "CONFLICT",
      message:
        "O preço deste curso mudou para 450 pts. Confira e troque de novo.",
    });
    expect(await saldoDe(userId)).toBe(1000);
  });

  test("curso de trilha liberada dá CONFLICT e não aparece na vitrine", async () => {
    const userId = await aluno(1000);
    const c = await cursoTrocavel(300);
    const [t] = await db
      .insert(trilha)
      .values({ descricao: "teste", slug: `teste-${hex()}`, titulo: "Trilha" })
      .returning({ id: trilha.id });
    trilhas.push(t?.id ?? "");
    await db
      .insert(trilhaCurso)
      .values({ cursoId: c, posicao: 1, trilhaId: t?.id ?? "" });
    await db.insert(liberacao).values({
      liberadaPor: "user_admin",
      origem: "admin",
      trilhaId: t?.id,
      userId,
    });
    const erro = await trocar(db, userId, c, 300, AGORA).catch(
      (e: unknown) => e
    );
    expect(erro).toMatchObject({ code: "CONFLICT" });
    const painel = await carregarPainelDeTroca(db, userId, AGORA);
    expect(painel.cartoes.map((x) => x.curso.id)).not.toContain(c);
  });

  test("curso fora da troca ou inexistente dá NOT_FOUND; saldo curto dá PRECONDITION_FAILED", async () => {
    const userId = await aluno(100);
    const fora = await cursoTrocavel(null);
    const caro = await cursoTrocavel(300);
    const r = await Promise.allSettled([
      trocar(db, userId, fora, 300, AGORA),
      trocar(db, userId, crypto.randomUUID() as CursoId, 300, AGORA),
    ]);
    expect(r.map(codigo)).toEqual(["NOT_FOUND", "NOT_FOUND"]);
    const curto = await trocar(db, userId, caro, 300, AGORA).catch(
      (e: unknown) => e
    );
    expect(curto).toMatchObject({
      code: "PRECONDITION_FAILED",
      message: "Faltam 200 pts para trocar este curso.",
    });
  });

  test("sem login dá UNAUTHORIZED; cursoId fora do formato dá BAD_REQUEST", async () => {
    const anonimo = createCaller({ auth: null, db });
    const logado = createCaller({ auth: { userId: await aluno(0) }, db });
    const r = await Promise.allSettled([
      anonimo.troca.painel(),
      logado.troca.trocar({ cursoId: "nao-e-uuid", precoVisto: 300 }),
    ]);
    expect(r.map(codigo)).toEqual(["UNAUTHORIZED", "BAD_REQUEST"]);
  });
});
