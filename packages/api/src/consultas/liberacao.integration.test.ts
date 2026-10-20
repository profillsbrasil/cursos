import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  aula,
  curso,
  liberacao,
  modulo,
  pontoLancamento,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { eq, inArray, sql } from "drizzle-orm";

import { alunoDeTeste, contextoDeTeste } from "../contexto-de-teste";
import type {
  AdminId,
  CursoId,
  DiaISO,
  LiberacaoId,
  Pessoa,
} from "../dominio/tipos";
import { createCaller } from "../routers/index";
import { categoriaDeTeste, codigoDeTeste } from "./categoria-de-teste";
import {
  esperas as esperasNoBanco,
  seguraATabela,
  urlDaCorrida,
} from "./corrida-de-teste";
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
  const db = createDb({
    DATABASE_URL: urlDaCorrida(URL_TESTE),
  });
  const alunos: string[] = [];
  const cursos: string[] = [];

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
        categoriaId: await categoriaDeTeste(db),
        codigo: codigoDeTeste(),
        precoTroca,
        slug: `teste-${s}`,
        status: "publicado",
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
      })
      .from(liberacao)
      .where(eq(liberacao.userId, userId));

  const seguraOsInserts = () => seguraATabela(db);

  /** 'advisory' é a trava do aluno; 'relation', o INSERT ou o UPDATE parado. */
  const esperas = (n: number) =>
    esperasNoBanco(db, n, [
      'insert into "liberacao"',
      'update "liberacao"',
      "select pg_advisory_xact_lock",
    ]);

  const resultado = (r: PromiseSettledResult<unknown>) =>
    r.status === "rejected" && r.reason instanceof TRPCError
      ? r.reason.code
      : r.status;

  afterAll(async () => {
    await db
      .delete(pontoLancamento)
      .where(inArray(pontoLancamento.userId, alunos));
    await db.delete(liberacao).where(inArray(liberacao.userId, alunos));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  test("admin libera antes da troca: a troca espera a trava, vê o curso liberado e não debita", async () => {
    const userId = await aluno(300);
    const c = await cursoTrocavel(300);
    const soltar = await seguraOsInserts();
    const admin = liberar(db, ADMIN, pessoa(userId), c, AGORA);
    await esperas(1);
    const troca = trocar(db, alunoDeTeste(userId), c, 300, AGORA);
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

  test("troca antes do admin: a liberação espera a troca e devolve a liberação dela", async () => {
    const userId = await aluno(300);
    const c = await cursoTrocavel(300);
    const soltar = await seguraOsInserts();
    const troca = trocar(db, alunoDeTeste(userId), c, 300, AGORA);
    await esperas(1);
    const admin = liberar(db, ADMIN, pessoa(userId), c, AGORA);
    const paradas = await esperas(2);
    await soltar();
    const [rTroca, r] = await Promise.allSettled([troca, admin]);
    const ativas = (await liberacoesDe(userId)).filter((l) => !l.revogadaEm);
    expect({
      admin: r.status === "fulfilled" ? r.value.nova : resultado(r),
      ativas: ativas.map((l) => l.origem),
      paradas,
      saldo: await saldoDe(userId),
      troca: resultado(rTroca),
    }).toEqual({
      admin: false,
      ativas: ["troca"],
      paradas: ["advisory", "relation"],
      saldo: 0,
      troca: "fulfilled",
    });
  });

  test("revogar antes de liberar: a liberação espera a revogação e grava uma nova", async () => {
    const userId = await aluno();
    const c = await cursoTrocavel(300);
    const { liberacaoId } = await liberar(db, ADMIN, pessoa(userId), c, AGORA);
    const soltar = await seguraOsInserts();
    const revogacao = revogar(db, ADMIN, liberacaoId, AGORA);
    await esperas(1);
    const liberacaoNova = liberar(db, ADMIN, pessoa(userId), c, AGORA);
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
    const cursoId = await cursoTrocavel(300);
    const [a, b] = await Promise.all([
      liberar(db, ADMIN, pessoa(userId), cursoId, AGORA),
      liberar(db, ADMIN, pessoa(userId), cursoId, AGORA),
    ]);
    const c = await liberar(db, ADMIN, pessoa(userId), cursoId, AGORA);
    expect([a.nova, b.nova].sort()).toEqual([false, true]);
    expect(b.liberacaoId).toBe(a.liberacaoId);
    expect(c).toEqual({
      liberacaoId: a.liberacaoId,
      liberadaEm: AGORA,
      nova: false,
      origem: "admin",
    });
    expect(await liberacoesDe(userId)).toHaveLength(1);
  });

  test("revogar duas vezes muda a linha uma vez", async () => {
    const userId = await aluno();
    const c = await cursoTrocavel(300);
    const { liberacaoId } = await liberar(db, ADMIN, pessoa(userId), c, AGORA);
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
    const c = await cursoTrocavel(300);
    const { liberacaoId } = await liberar(db, ADMIN, pessoa(userId), c, AGORA);
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
    await trocar(db, alunoDeTeste(userId), c, 300, AGORA);
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

  test("liberar curso que não existe dá NOT_FOUND e não grava", async () => {
    const userId = await aluno();
    const erro = await liberar(
      db,
      ADMIN,
      pessoa(userId),
      crypto.randomUUID() as CursoId,
      AGORA
    ).catch((e: unknown) => e);
    expect(erro).toMatchObject({
      code: "NOT_FOUND",
      message: "Este curso não existe mais.",
    });
    expect(await liberacoesDe(userId)).toEqual([]);
  });

  test("liberar o curso enquanto ele é apagado: o liberar espera e recusa com a frase de curso que não existe", async () => {
    const userId = await aluno();
    const c = await cursoTrocavel(300);
    const admin = createCaller(
      contextoDeTeste({
        db,
        papel: "admin",
        pessoas: [pessoa(userId)],
        userId: ADMIN,
      })
    );
    const outro = await db.$client.connect();
    try {
      await outro.query("begin");
      await outro.query("delete from curso where id = $1", [c]);
      const liberando = admin.admin.alunos.liberar({ cursoId: c, userId }).then(
        () => ({ code: "ok", message: "" }),
        (e: unknown) =>
          e instanceof TRPCError
            ? { code: e.code, message: e.message }
            : { code: "não é TRPCError", message: String(e) }
      );
      const paradas = await esperasNoBanco(db, 1, ['insert into "liberacao"']);
      await outro.query("commit");

      expect({ liberando: await liberando, paradas }).toEqual({
        liberando: {
          code: "NOT_FOUND",
          message: "Este curso não existe mais.",
        },
        paradas: ["transactionid"],
      });
      expect(await liberacoesDe(userId)).toEqual([]);
    } finally {
      // Sem o commit, a transação aberta morre com a conexão em vez de voltar ao pool.
      outro.release(true);
    }
  });

  test("o admin libera para si mesmo pela API e revoga", async () => {
    const dono = await aluno();
    const c = await cursoTrocavel(300);
    const admin = createCaller(
      contextoDeTeste({
        db,
        papel: "admin",
        pessoas: [{ email: null, foto: null, nome: "Dono", userId: dono }],
        userId: dono,
      })
    );
    const { liberacaoId } = await admin.admin.alunos.liberar({
      cursoId: c,
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
    const c = await cursoTrocavel(300);
    const admin = createCaller(
      contextoDeTeste({ db, papel: "admin", userId: "user_dono" })
    );
    const erro = await admin.admin.alunos
      .liberar({ cursoId: c, userId: sumiu })
      .catch((e: unknown) => e);
    expect(erro).toMatchObject({ code: "NOT_FOUND" });
    expect(await liberacoesDe(sumiu)).toHaveLength(0);
  });

  describe("admin.alunos.liberarVarios", () => {
    const nomeado = (userId: string, nome: string): Pessoa => ({
      email: `${nome.toLowerCase()}@exemplo.com`,
      foto: null,
      nome,
      userId,
    });
    const loteDe = (conhecidas: readonly Pessoa[], clerkCai?: string) => {
      const ctx = contextoDeTeste({
        db,
        papel: "admin",
        pessoas: conhecidas,
        userId: "user_dono",
      });
      const { porId } = ctx.pessoas;
      ctx.pessoas.porId = (id) =>
        id === clerkCai
          ? Promise.reject(new Error("Clerk fora do ar"))
          : porId(id);
      return createCaller(ctx).admin.alunos.liberarVarios;
    };

    test("libera quem não tem, diz quem já tinha e por onde, e a falha de uma pessoa não derruba as outras", async () => {
      const c = await cursoTrocavel(300);
      const [nova, peloAdmin, porTroca, semLogin, clerkCaiu] = [
        await aluno(),
        await aluno(),
        await aluno(300),
        await aluno(),
        await aluno(),
      ];
      const ontem = new Date("2026-08-20T15:00:00Z");
      await liberar(db, ADMIN, pessoa(peloAdmin), c, ontem);
      await trocar(
        db,
        alunoDeTeste(porTroca),
        c,
        300,
        new Date("2025-12-30T15:00:00Z")
      );
      const liberarVarios = loteDe(
        [
          nomeado(nova, "Ana"),
          nomeado(peloAdmin, "Bruno"),
          nomeado(porTroca, "Carla"),
          nomeado(clerkCaiu, "Davi"),
        ],
        clerkCaiu
      );
      const errosNoLog: unknown[] = [];
      const logOriginal = console.error;
      console.error = (...args: unknown[]) => {
        errosNoLog.push(args[0]);
      };
      const r = await liberarVarios({
        cursoId: c,
        userIds: [nova, peloAdmin, porTroca, semLogin, clerkCaiu, nova],
      }).finally(() => {
        console.error = logOriginal;
      });

      expect(r.pessoas).toEqual([
        { tipo: "liberada_agora", userId: nova },
        {
          liberadaEm: "2026-08-20" as DiaISO,
          origem: "admin",
          tipo: "ja_tinha",
          userId: peloAdmin,
        },
        {
          liberadaEm: "2025-12-30" as DiaISO,
          origem: "troca",
          tipo: "ja_tinha",
          userId: porTroca,
        },
        {
          mensagem: "Esta pessoa não existe mais no login da plataforma.",
          tipo: "nao_liberou",
          userId: semLogin,
        },
        {
          mensagem: "Não deu para liberar agora. Nada mudou para esta pessoa.",
          tipo: "nao_liberou",
          userId: clerkCaiu,
        },
      ]);
      expect(errosNoLog).toEqual([`liberarVarios: ${clerkCaiu} não liberou`]);
      const ativas = async (userId: string) =>
        (await liberacoesDe(userId)).map((l) => [l.origem, l.revogadaEm]);
      expect(await ativas(nova)).toEqual([["admin", null]]);
      expect(await ativas(peloAdmin)).toEqual([["admin", null]]);
      expect(await ativas(porTroca)).toEqual([["troca", null]]);
      expect(await ativas(semLogin)).toEqual([]);
      expect(await ativas(clerkCaiu)).toEqual([]);
    });

    test("Tentar de novo com a mesma pessoa diz que ela já tem o curso", async () => {
      const c = await cursoTrocavel(300);
      const userId = await aluno();
      const liberarVarios = loteDe([nomeado(userId, "Ana")]);
      await liberarVarios({ cursoId: c, userIds: [userId] });
      const r = await liberarVarios({ cursoId: c, userIds: [userId] });
      expect(r.pessoas.map((p) => p.tipo)).toEqual(["ja_tinha"]);
      expect(await liberacoesDe(userId)).toHaveLength(1);
    });

    test("o curso que não existe recusa o lote inteiro sem gravar", async () => {
      const userId = await aluno();
      const erro = await loteDe([nomeado(userId, "Ana")])({
        cursoId: "00000000-0000-4000-8000-000000000000" as CursoId,
        userIds: [userId],
      }).catch((e: unknown) => e);
      expect(erro).toMatchObject({
        code: "NOT_FOUND",
        message: "Este curso não existe mais.",
      });
      expect(await liberacoesDe(userId)).toHaveLength(0);
    });

    test("aceita até 50 pessoas: 51 é recusado antes de gravar, e lista vazia também", async () => {
      const c = await cursoTrocavel(300);
      const userIds = Array.from({ length: 51 }, (_, i) => `user_teto${S}${i}`);
      alunos.push(...userIds);
      const liberarVarios = loteDe(userIds.map((u) => nomeado(u, "Pessoa")));
      const recusas = await Promise.all(
        [userIds, []].map((lista) =>
          liberarVarios({ cursoId: c, userIds: lista }).catch(
            (e: { code?: string }) => e.code
          )
        )
      );
      expect(recusas).toEqual(["BAD_REQUEST", "BAD_REQUEST"]);
      const gravadas = await db
        .select({ id: liberacao.id })
        .from(liberacao)
        .where(inArray(liberacao.userId, userIds));
      expect(gravadas).toHaveLength(0);

      const r = await liberarVarios({
        cursoId: c,
        userIds: userIds.slice(0, 50),
      });
      expect(r.pessoas.filter((p) => p.tipo === "liberada_agora")).toHaveLength(
        50
      );
    });
  });
});
