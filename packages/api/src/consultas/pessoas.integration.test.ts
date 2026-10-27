import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { setTimeout as esperar } from "node:timers/promises";
import { createDb } from "@cursos/db";
import { perfilDaPessoa, pontoLancamento } from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { inArray } from "drizzle-orm";

import { contextoDeTeste, pessoasDeTeste } from "../contexto-de-teste";
import type { Conta, Pessoa } from "../dominio/tipos";
import { createCaller } from "../routers/index";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const codigo = (e: unknown) =>
  e instanceof TRPCError ? e.code : `não é TRPCError: ${String(e)}`;

describe.skipIf(URL_TESTE === null)("admin.pessoas", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const DONA = `user_dona${S}`;
  const ANA = `user_ana${S}`;
  const BRUNO = `user_bruno${S}`;
  const CARLA = `user_carla${S}`;
  const pessoas: (Pessoa & Partial<Conta>)[] = [
    {
      email: "dona@profills.com",
      foto: null,
      nome: `Dona ${S}`,
      papel: "admin",
      userId: DONA,
    },
    { email: "ana@profills.com", foto: null, nome: `Ana ${S}`, userId: ANA },
    {
      email: "bruno@cliente.example",
      foto: null,
      nome: `Bruno ${S}`,
      userId: BRUNO,
    },
    {
      email: "carla@profills.com",
      emailVerificado: false,
      foto: null,
      nome: `Carla ${S}`,
      userId: CARLA,
    },
  ];
  const admin = createCaller(
    contextoDeTeste({ db, papel: "admin", pessoas, userId: DONA })
  );
  const entrar = (userId: string) =>
    createCaller(contextoDeTeste({ db, pessoas, userId })).meusCursos.painel();

  afterAll(async () => {
    // O primeiro acesso de Funcionário lança o bônus (bonus-de-funcionario.integration.test.ts).
    await db
      .delete(pontoLancamento)
      .where(inArray(pontoLancamento.userId, [DONA, ANA, BRUNO, CARLA]));
    await db
      .delete(perfilDaPessoa)
      .where(inArray(perfilDaPessoa.userId, [DONA, ANA, BRUNO, CARLA]));
    await db.$client.end();
  });

  test("quem ainda não entrou aparece com o perfil do cadastro, marcado como tal", async () => {
    const { pessoas: lista } = await admin.admin.pessoas.lista({
      perfil: null,
      termo: S,
    });
    const porNome = Object.fromEntries(lista.map((p) => [p.userId, p]));
    expect(porNome[ANA]?.perfil).toEqual({
      doCadastro: true,
      perfil: "funcionario",
    });
    expect(porNome[CARLA]?.perfil).toEqual({
      doCadastro: true,
      perfil: "publico",
    });
    expect(porNome[DONA]?.papel).toBe("admin");
    expect(porNome[BRUNO]?.papel).toBe("aluno");
  });

  test("o filtro de perfil lista só quem entrou com ele, e a contagem sobe", async () => {
    const antes = await admin.admin.pessoas.lista({ perfil: null, termo: S });
    await entrar(ANA);
    await entrar(BRUNO);
    await admin.admin.pessoas.definirPerfil({
      perfil: "cliente",
      userId: BRUNO,
    });
    const clientes = await admin.admin.pessoas.lista({
      perfil: "cliente",
      termo: S,
    });
    expect(clientes.pessoas.map((p) => p.userId)).toEqual([BRUNO]);
    expect(clientes.pessoas[0]?.perfil).toEqual({
      doCadastro: false,
      perfil: "cliente",
    });
    expect(clientes.contagem.cliente).toBe(antes.contagem.cliente + 1);
    expect(clientes.contagem.funcionario).toBe(antes.contagem.funcionario + 1);
  });

  test("a ficha diz quem mudou o perfil, e o admin se vê como ele mesmo", async () => {
    await admin.admin.pessoas.definirPerfil({
      perfil: "cliente",
      userId: CARLA,
    });
    const ficha = await admin.admin.pessoas.ficha({ userId: CARLA });
    expect(ficha?.perfil).toEqual({ doCadastro: false, perfil: "cliente" });
    expect(ficha?.mudanca?.por).toBe(`Dona ${S}`);
    expect(ficha?.souEu).toBe(false);
    expect((await admin.admin.pessoas.ficha({ userId: DONA }))?.souEu).toBe(
      true
    );
  });

  test("a ficha de quem o Clerk não conhece, ou de um userId fora do formato, é null", async () => {
    expect(
      await admin.admin.pessoas.ficha({ userId: `user_sumiu${S}` })
    ).toBeNull();
    expect(await admin.admin.pessoas.ficha({ userId: "ana@x.com" })).toBeNull();
  });

  test("o admin dá e tira o papel de outra pessoa, mas não tira o próprio", async () => {
    await admin.admin.pessoas.definirPapel({ papel: "admin", userId: ANA });
    expect(
      (await admin.admin.pessoas.ficha({ userId: ANA }))?.conta.papel
    ).toBe("admin");
    await admin.admin.pessoas.definirPapel({ papel: "aluno", userId: ANA });
    expect(
      (await admin.admin.pessoas.ficha({ userId: ANA }))?.conta.papel
    ).toBe("aluno");
    expect(
      await admin.admin.pessoas
        .definirPapel({ papel: "aluno", userId: DONA })
        .catch(codigo)
    ).toBe("PRECONDITION_FAILED");
  });

  test("dois admins tirando o papel um do outro ao mesmo tempo: um tira, o outro é recusado", async () => {
    const A = `user_a${S}`;
    const B = `user_b${S}`;
    const clerk = pessoasDeTeste([
      { email: null, foto: null, nome: "A", papel: "admin", userId: A },
      { email: null, foto: null, nome: "B", papel: "admin", userId: B },
    ]);
    const { definirPapel } = clerk;
    // A espera põe as duas mudanças no ar ao mesmo tempo, antes de uma gravar.
    clerk.definirPapel = async (userId, papel) => {
      await esperar(50);
      await definirPapel(userId, papel);
    };
    const como = (userId: string) =>
      createCaller({
        ...contextoDeTeste({ db, papel: "admin", userId }),
        pessoas: clerk,
      });
    const resultados = await Promise.allSettled([
      como(A).admin.pessoas.definirPapel({ papel: "aluno", userId: B }),
      como(B).admin.pessoas.definirPapel({ papel: "aluno", userId: A }),
    ]);
    expect(resultados.map((r) => r.status).sort()).toEqual([
      "fulfilled",
      "rejected",
    ]);
    const recusa = resultados.find((r) => r.status === "rejected");
    expect(recusa?.status === "rejected" && codigo(recusa.reason)).toBe(
      "FORBIDDEN"
    );
    const papeis = await Promise.all([clerk.conta(A), clerk.conta(B)]);
    expect(papeis.filter((c) => c?.papel === "admin")).toHaveLength(1);
  });

  test("mudar perfil ou papel de quem o Clerk não conhece recusa com a frase", async () => {
    const sumiu = `user_sumiu${S}`;
    expect(
      await admin.admin.pessoas
        .definirPerfil({ perfil: "cliente", userId: sumiu })
        .catch(codigo)
    ).toBe("NOT_FOUND");
    expect(
      await admin.admin.pessoas
        .definirPapel({ papel: "admin", userId: sumiu })
        .catch(codigo)
    ).toBe("NOT_FOUND");
  });
});
