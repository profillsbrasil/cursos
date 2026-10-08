import { describe, expect, test } from "bun:test";

import { type AuthDoClerk, contextoDe } from "../context";
import { contextoDeTeste, pessoasDeTeste } from "../contexto-de-teste";
import { appRouter, createCaller } from "./index";

const db = {} as never;
const servicos = { db, pessoas: pessoasDeTeste([]) };

const sessao = (claims: Record<string, unknown>, userId = "user_x") =>
  ({ sessionClaims: claims, userId }) as unknown as AuthDoClerk;

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

/** Chama um procedimento pelo caminho, sem entrada: a porta roda antes da validação. */
function chamar(caller: ReturnType<typeof createCaller>, caminho: string) {
  const alvo = caminho
    .split(".")
    .reduce<unknown>(
      (no, chave) => (no as Record<string, unknown>)[chave],
      caller
    );
  return (alvo as (entrada?: unknown) => Promise<unknown>)();
}

describe("todo procedimento admin.* passa pelo adminProcedure", () => {
  test("o router tem procedimentos do admin", () => {
    expect(PROCEDIMENTOS_DO_ADMIN.length).toBeGreaterThan(0);
  });

  test("sem sessão, todos respondem UNAUTHORIZED", async () => {
    const anonimo = createCaller(contextoDeTeste({ db, userId: null }));
    const codigos = await Promise.all(
      PROCEDIMENTOS_DO_ADMIN.map((caminho) =>
        chamar(anonimo, caminho).then(
          () => "passou",
          (e: { code?: string }) => e.code
        )
      )
    );
    expect(codigos).toEqual(PROCEDIMENTOS_DO_ADMIN.map(() => "UNAUTHORIZED"));
  });

  test("com aluno, todos respondem FORBIDDEN", async () => {
    const aluno = createCaller(contextoDeTeste({ db, userId: "user_x" }));
    const codigos = await Promise.all(
      PROCEDIMENTOS_DO_ADMIN.map((caminho) =>
        chamar(aluno, caminho).then(
          () => "passou",
          (e: { code?: string }) => e.code
        )
      )
    );
    expect(codigos).toEqual(PROCEDIMENTOS_DO_ADMIN.map(() => "FORBIDDEN"));
  });
});
