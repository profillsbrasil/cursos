import { describe, expect, test } from "bun:test";

import { callTRPCProcedure, TRPCError } from "@trpc/server";

import { type AuthDoClerk, type Context, contextoDe } from "../context";
import {
  bancoSemServidor,
  contextoDeTeste,
  convitesDeTeste,
  pessoasDeTeste,
} from "../contexto-de-teste";
import { capasDesligadas } from "../externos/capas";
import { materiaisDesligados } from "../externos/materiais";
import { appRouter, createCaller } from "./index";

const db = bancoSemServidor();

const servicos = {
  capas: capasDesligadas,
  convites: convitesDeTeste(),
  db,
  materiais: materiaisDesligados,
  pessoas: pessoasDeTeste([]),
};

const sessao = (
  claims: Record<string, unknown>,
  userId = "user_x"
): AuthDoClerk => ({ sessionClaims: claims, userId });

describe("contextoDe lê o papel do claim", () => {
  test("claim papel admin vira admin", () => {
    const ctx = contextoDe(sessao({ papel: "admin" }, "user_dono"), servicos);
    expect([ctx.auth?.papel, ctx.auth?.userId]).toEqual(["admin", "user_dono"]);
  });

  test("claim ausente, null ou com outro texto vira aluno", () => {
    const claims = [{}, { papel: null }, { papel: "Admin" }, { papel: "root" }];

    for (const c of claims) {
      expect(contextoDe(sessao(c), servicos).auth).toMatchObject({
        papel: "aluno",
        userId: "user_x",
      });
    }
  });

  test("sem sessão não tem auth", () => {
    expect(contextoDe(null, servicos).auth).toBeNull();
    expect(
      contextoDe({ sessionClaims: null, userId: null }, servicos).auth
    ).toBeNull();
  });
});

const PROCEDIMENTOS_DO_ADMIN = Object.keys(appRouter._def.procedures).filter(
  (caminho) => caminho.startsWith("admin.")
);

async function chamarSemEntradaPoisAPortaRodaAntesDaValidacao(
  ctx: Context,
  caminho: string
) {
  const resposta: unknown = await callTRPCProcedure({
    allowMethodOverride: true,
    batchIndex: 0,
    ctx,
    getRawInput: () => Promise.resolve(undefined),
    path: caminho,
    router: appRouter,
    signal: undefined,
    type: "query",
  });

  return resposta;
}

describe("admin.liberacoes.acesso com userId fora do formato", () => {
  test("devolve null, de qualquer tamanho, e a página vira 404", async () => {
    const admin = createCaller(
      contextoDeTeste({ db, papel: "admin", userId: "user_dono" })
    );

    const r = await Promise.all(
      ["qualquer-coisa", `user_${"a".repeat(120)}-`, ""].map((userId) =>
        admin.admin.liberacoes.acesso({ userId })
      )
    );

    expect(r).toEqual([null, null, null]);
  });
});

describe("todo procedimento admin.* passa pelo adminProcedure", () => {
  test("o router tem procedimentos do admin", () => {
    expect(PROCEDIMENTOS_DO_ADMIN.length).toBeGreaterThan(0);
  });

  test("sem sessão, todos respondem UNAUTHORIZED", async () => {
    const anonimo = contextoDeTeste({ db, userId: null });

    const codigos = await Promise.all(
      PROCEDIMENTOS_DO_ADMIN.map((caminho) =>
        chamarSemEntradaPoisAPortaRodaAntesDaValidacao(anonimo, caminho).then(
          () => "passou",
          (e: unknown) => (e instanceof TRPCError ? e.code : undefined)
        )
      )
    );

    expect(codigos).toEqual(PROCEDIMENTOS_DO_ADMIN.map(() => "UNAUTHORIZED"));
  });

  test("com aluno, todos respondem FORBIDDEN", async () => {
    const aluno = contextoDeTeste({ db, userId: "user_x" });

    const codigos = await Promise.all(
      PROCEDIMENTOS_DO_ADMIN.map((caminho) =>
        chamarSemEntradaPoisAPortaRodaAntesDaValidacao(aluno, caminho).then(
          () => "passou",
          (e: unknown) => (e instanceof TRPCError ? e.code : undefined)
        )
      )
    );

    expect(codigos).toEqual(PROCEDIMENTOS_DO_ADMIN.map(() => "FORBIDDEN"));
  });
});
