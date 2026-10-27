import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  concessaoDePontos,
  perfilDaPessoa,
  pontoLancamento,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import { diaLocal, segundaDaSemana } from "../dominio/sequencia";
import type { AdminId } from "../dominio/tipos";
import { ErroParaAPessoa } from "../index";
import { createCaller } from "../routers/index";
import { concederPontos } from "./concessao";
import { PESSOA_SUMIU } from "./liberacao";
import { linhasDoSaldo } from "./pontos";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
// Terça: a segunda da semana é 26 de outubro.
const AGORA = new Date("2026-10-27T15:00:00Z");
const SEGUNDA = segundaDaSemana(diaLocal(AGORA));
const ADMIN = `user_admin${S}`;

describe.skipIf(URL_TESTE === null)("concessão de pontos", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const alunos: string[] = [];

  /** Um aluno com `antes` pontos de semanas passadas e 30 desta semana. */
  async function aluno(antes: number) {
    const userId = `user_concessao${S}${alunos.length}`;
    alunos.push(userId);
    await db.insert(pontoLancamento).values([
      ...Array.from({ length: antes / 10 }, (_, i) => ({
        criadoEm: new Date(Date.UTC(2026, 0, 1 + i, 15)),
        diaMarco: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
        motivo: "sequencia_7_dias" as const,
        pontos: 10,
        userId,
      })),
      {
        criadoEm: new Date("2026-10-26T15:00:00Z"),
        diaMarco: "2026-10-26",
        motivo: "sequencia_7_dias" as const,
        pontos: 30,
        userId,
      },
    ]);
    return userId;
  }

  const pessoas = () =>
    alunos.map((userId) => ({
      email: null,
      foto: null,
      nome: `Pessoa ${userId}`,
      userId,
    }));

  const comoAdmin = () =>
    createCaller(
      contextoDeTeste({
        db,
        papel: "admin",
        pessoas: [
          ...pessoas(),
          { email: null, foto: null, nome: "Admin", userId: ADMIN },
        ],
        userId: ADMIN,
      })
    );

  const recusa = (e: unknown) =>
    e instanceof ErroParaAPessoa ? e.message : `outro erro: ${String(e)}`;

  afterAll(async () => {
    await db
      .delete(pontoLancamento)
      .where(inArray(pontoLancamento.userId, alunos));
    await db
      .delete(concessaoDePontos)
      .where(inArray(concessaoDePontos.userId, alunos));
    await db
      .delete(perfilDaPessoa)
      .where(inArray(perfilDaPessoa.userId, alunos));
    await db.$client.end();
  });

  test("dar soma ao saldo e não entra nos pontos da semana", async () => {
    const userId = await aluno(100);
    expect(await linhasDoSaldo(db, userId, SEGUNDA)).toEqual({
      entradasDaSemana: 30,
      saldo: 130,
    });
    const r = await concederPontos(
      db,
      ADMIN as AdminId,
      { motivo: "Campanha de vendas", pontos: 3000, userId },
      AGORA
    );
    expect(r.saldo).toBe(3130);
    expect(await linhasDoSaldo(db, userId, SEGUNDA)).toEqual({
      entradasDaSemana: 30,
      saldo: 3130,
    });
    const [concessao] = await db
      .select()
      .from(concessaoDePontos)
      .where(eq(concessaoDePontos.id, r.concessaoId));
    expect(concessao).toMatchObject({
      concedidaEm: AGORA,
      concedidaPor: ADMIN,
      motivo: "Campanha de vendas",
      pontos: 3000,
      userId,
    });
    const lancamentos = await db
      .select({
        motivo: pontoLancamento.motivo,
        pontos: pontoLancamento.pontos,
      })
      .from(pontoLancamento)
      .where(eq(pontoLancamento.concessaoId, r.concessaoId));
    expect(lancamentos).toEqual([{ motivo: "concessao", pontos: 3000 }]);
  });

  test("tirar desconta do saldo, e o aluno vê no extrato o rótulo e o motivo", async () => {
    const userId = await aluno(100);
    await comoAdmin().admin.pessoas.concederPontos({
      motivo: "Lançado em dobro",
      pontos: -40,
      userId,
    });
    const painel = await createCaller(
      contextoDeTeste({ db, pessoas: pessoas(), userId })
    ).troca.painel();
    expect(painel.saldo).toBe(90);
    expect(painel.pontosSemana).toBe(30);
    expect(painel.extrato[0]).toMatchObject({
      pontos: -40,
      texto: "Ajuste do admin: Lançado em dobro",
    });
  });

  test("tirar além do saldo é recusado com o saldo na frase, e nada se grava", async () => {
    const userId = await aluno(100);
    const erro = await comoAdmin()
      .admin.pessoas.concederPontos({
        motivo: "Ajuste",
        pontos: -131,
        userId,
      })
      .then(() => null, recusa);
    expect(erro).toBe("A pessoa tem só 130 pontos.");
    expect((await linhasDoSaldo(db, userId, SEGUNDA)).saldo).toBe(130);
    const gravadas = await db
      .select({ id: concessaoDePontos.id })
      .from(concessaoDePontos)
      .where(eq(concessaoDePontos.userId, userId));
    expect(gravadas).toEqual([]);
  });

  test("tirar o saldo inteiro deixa zero", async () => {
    const userId = await aluno(0);
    const r = await concederPontos(
      db,
      ADMIN as AdminId,
      { motivo: "Ajuste", pontos: -30, userId },
      AGORA
    );
    expect(r.saldo).toBe(0);
  });

  test("duas retiradas ao mesmo tempo não deixam o saldo negativo", async () => {
    const userId = await aluno(70);
    const resultados = await Promise.allSettled(
      [1, 2].map(() =>
        concederPontos(
          db,
          ADMIN as AdminId,
          { motivo: "Ajuste", pontos: -60, userId },
          AGORA
        )
      )
    );
    const recusas = resultados.flatMap((r) =>
      r.status === "rejected" ? [recusa(r.reason)] : []
    );
    expect(recusas).toEqual(["A pessoa tem só 40 pontos."]);
    expect((await linhasDoSaldo(db, userId, SEGUNDA)).saldo).toBe(40);
  });

  test("motivo vazio ou só de espaços é recusado antes do banco", async () => {
    const userId = await aluno(0);
    const codigos = await Promise.all(
      ["", "   "].map((motivo) =>
        comoAdmin()
          .admin.pessoas.concederPontos({ motivo, pontos: 10, userId })
          .then(
            () => "passou",
            (e: unknown) => (e instanceof TRPCError ? e.code : String(e))
          )
      )
    );
    expect(codigos).toEqual(["BAD_REQUEST", "BAD_REQUEST"]);
  });

  test("zero pontos e acima do teto são recusados antes do banco", async () => {
    const userId = await aluno(0);
    const codigos = await Promise.all(
      [0, 100_001, -100_001, 1.5].map((pontos) =>
        comoAdmin()
          .admin.pessoas.concederPontos({ motivo: "X", pontos, userId })
          .then(
            () => "passou",
            (e: unknown) => (e instanceof TRPCError ? e.code : String(e))
          )
      )
    );
    expect(codigos).toEqual([
      "BAD_REQUEST",
      "BAD_REQUEST",
      "BAD_REQUEST",
      "BAD_REQUEST",
    ]);
  });

  test("pessoa que o Clerk não conhece é recusada", async () => {
    const erro = await comoAdmin()
      .admin.pessoas.concederPontos({
        motivo: "Campanha",
        pontos: 10,
        userId: `user_ninguem${S}`,
      })
      .then(() => null, recusa);
    expect(erro).toBe(PESSOA_SUMIU);
  });

  test("a ficha mostra o saldo e as concessões, da mais recente, com o nome do admin", async () => {
    const userId = await aluno(0);
    await concederPontos(
      db,
      ADMIN as AdminId,
      { motivo: "Primeira", pontos: 500, userId },
      AGORA
    );
    await concederPontos(
      db,
      ADMIN as AdminId,
      { motivo: "Segunda", pontos: -20, userId },
      new Date(AGORA.getTime() + 60_000)
    );
    const ficha = await comoAdmin().admin.pessoas.ficha({ userId });
    expect(ficha?.pontos.saldo).toBe(510);
    expect(
      ficha?.pontos.concessoes.map((c) => [c.pontos, c.motivo, c.por])
    ).toEqual([
      [-20, "Segunda", "Admin"],
      [500, "Primeira", "Admin"],
    ]);
  });
});
