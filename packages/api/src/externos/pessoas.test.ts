import { describe, expect, test } from "bun:test";
import type { ClerkClient, User } from "@clerk/backend";

import { paraPessoa, pessoasDoClerk } from "./pessoas";

function usuario(parcial: Partial<User>): User {
  return {
    createdAt: 0,
    externalAccounts: [],
    fullName: null,
    hasImage: false,
    id: "user_ana",
    imageUrl: "https://img.clerk.com/padrao",
    lastActiveAt: null,
    passwordEnabled: false,
    primaryEmailAddress: null,
    publicMetadata: {},
    username: null,
    ...parcial,
  } as User;
}

const email = (emailAddress: string) =>
  ({ emailAddress }) as User["primaryEmailAddress"];

describe("paraPessoa", () => {
  test("o nome cai de fullName para username, e-mail e userId, nessa ordem", () => {
    const nomes = [
      usuario({
        fullName: "Ana Souza",
        primaryEmailAddress: email("ana@x.com"),
        username: "ana",
      }),
      usuario({ primaryEmailAddress: email("ana@x.com"), username: "ana" }),
      usuario({ primaryEmailAddress: email("ana@x.com") }),
      usuario({}),
    ].map((u) => paraPessoa(u).nome);
    expect(nomes).toEqual(["Ana Souza", "ana", "ana@x.com", "user_ana"]);
  });

  test("a foto só vem quando a pessoa subiu uma; o avatar padrão do Clerk fica de fora", () => {
    expect(paraPessoa(usuario({ hasImage: true })).foto).toBe(
      "https://img.clerk.com/padrao"
    );
    expect(paraPessoa(usuario({ hasImage: false })).foto).toBeNull();
  });

  test("sem e-mail principal, email é null", () => {
    expect(paraPessoa(usuario({})).email).toBeNull();
  });
});

describe("pessoasDoClerk.buscar", () => {
  test("devolve o total do Clerk junto com a página cortada", async () => {
    const clerk = {
      users: {
        getUserList: () =>
          Promise.resolve({ data: [usuario({})], totalCount: 143 }),
      },
    } as unknown as ClerkClient;
    const r = await pessoasDoClerk(clerk).buscar("ana");
    expect({ nomes: r.pessoas.map((p) => p.nome), total: r.total }).toEqual({
      nomes: ["user_ana"],
      total: 143,
    });
  });
});

describe("a conta que o Clerk devolve na busca", () => {
  const umaConta = async (u: User) => {
    const clerk = {
      users: {
        getUserList: () => Promise.resolve({ data: [u], totalCount: 1 }),
      },
    } as unknown as ClerkClient;
    const [conta] = (await pessoasDoClerk(clerk).buscar("")).pessoas;
    return conta;
  };

  test("o papel vem do Public metadata, e qualquer outro valor é aluno", async () => {
    const papel = async (publicMetadata: Record<string, unknown>) =>
      (await umaConta(usuario({ publicMetadata })))?.papel;
    expect(await papel({ papel: "admin" })).toBe("admin");
    expect(await papel({ papel: "Admin" })).toBe("aluno");
    expect(await papel({})).toBe("aluno");
  });

  test("Google entra pelo provedor com ou sem o prefixo oauth_, e a senha pelo passwordEnabled", async () => {
    const jeitos = async (provider: string, passwordEnabled: boolean) =>
      (
        await umaConta(
          usuario({
            externalAccounts: [{ provider }] as User["externalAccounts"],
            passwordEnabled,
          })
        )
      )?.jeitosDeEntrar;
    expect(await jeitos("oauth_google", true)).toEqual(["senha", "google"]);
    expect(await jeitos("google", false)).toEqual(["google"]);
    expect(await jeitos("oauth_github", false)).toEqual([]);
  });

  test("só o e-mail com a verificação do Clerk conta como verificado", async () => {
    const verificado = async (status: string | null) =>
      (
        await umaConta(
          usuario({
            primaryEmailAddress: {
              emailAddress: "ana@profills.com",
              verification: status ? { status } : null,
            } as User["primaryEmailAddress"],
          })
        )
      )?.emailVerificado;
    expect(await verificado("verified")).toBe(true);
    expect(await verificado("unverified")).toBe(false);
    expect(await verificado(null)).toBe(false);
  });
});

describe("pessoasDoClerk.buscar entre userIds", () => {
  test("a lista vazia não chega ao Clerk, que leria sem filtro", async () => {
    let chamadas = 0;
    const clerk = {
      users: {
        getUserList: () => {
          chamadas += 1;
          return Promise.resolve({ data: [], totalCount: 0 });
        },
      },
    } as unknown as ClerkClient;
    expect(await pessoasDoClerk(clerk).buscar("", [])).toEqual({
      pessoas: [],
      total: 0,
    });
    expect(chamadas).toBe(0);
  });

  test("os userIds vão no filtro do Clerk junto com o termo", async () => {
    const pedidos: unknown[] = [];
    const clerk = {
      users: {
        getUserList: (p: unknown) => {
          pedidos.push(p);
          return Promise.resolve({ data: [], totalCount: 0 });
        },
      },
    } as unknown as ClerkClient;
    await pessoasDoClerk(clerk).buscar("ana", ["user_a", "user_b"]);
    expect(pedidos).toEqual([
      { limit: 20, query: "ana", userId: ["user_a", "user_b"] },
    ]);
  });
});
