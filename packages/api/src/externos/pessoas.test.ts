import { describe, expect, test } from "bun:test";

import { ehEmail, marcar } from "../dominio/marcas";
import {
  type ClerkDasPessoas,
  type FiltroDeUsuarios,
  paraPessoa,
  pessoasDoClerk,
  type UsuarioDoClerk,
} from "./pessoas";

function usuario(parcial: Partial<UsuarioDoClerk>): UsuarioDoClerk {
  return {
    createdAt: 0,
    emailAddresses: [],
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
  };
}

const email = (
  emailAddress: string
): UsuarioDoClerk["primaryEmailAddress"] => ({ emailAddress });

const clerkQueLista = (
  getUserList: ClerkDasPessoas["users"]["getUserList"]
): ClerkDasPessoas => ({
  users: {
    getUserList,
    updateUserMetadata: () =>
      Promise.reject(new Error("o teste não grava o Public metadata")),
  },
});

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
    const clerk = clerkQueLista(() =>
      Promise.resolve({ data: [usuario({})], totalCount: 143 })
    );

    const r = await pessoasDoClerk(clerk).buscar("ana");
    expect({ nomes: r.pessoas.map((p) => p.nome), total: r.total }).toEqual({
      nomes: ["user_ana"],
      total: 143,
    });
  });
});

describe("a conta que o Clerk devolve na busca", () => {
  const umaConta = async (u: UsuarioDoClerk) => {
    const clerk = clerkQueLista(() =>
      Promise.resolve({ data: [u], totalCount: 1 })
    );

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
            externalAccounts: [{ provider }],
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
            },
          })
        )
      )?.emailVerificado;

    expect(await verificado("verified")).toBe(true);
    expect(await verificado("unverified")).toBe(false);
    expect(await verificado(null)).toBe(false);
  });
});

describe("pessoasDoClerk.contasCom", () => {
  const comEmails = (id: string, ...emails: string[]) =>
    usuario({
      emailAddresses: emails.map((emailAddress) => ({ emailAddress })),
      id,
    });

  const clerkCom = (usuarios: UsuarioDoClerk[], pedidos: unknown[] = []) =>
    clerkQueLista((p: FiltroDeUsuarios) => {
      pedidos.push(p);

      const casados = usuarios.filter((u) =>
        u.emailAddresses.some((e) =>
          (p.emailAddress ?? []).some((trecho) =>
            e.emailAddress.toLowerCase().includes(trecho.toLowerCase())
          )
        )
      );

      const inicio = p.offset ?? 0;

      return Promise.resolve({
        data: casados.slice(inicio, inicio + p.limit),
        totalCount: casados.length,
      });
    });

  test("ana@ não é a conta de diana@: o trecho que o Clerk casa não conta", async () => {
    const clerk = clerkCom([comEmails("user_diana", "diana@x.com")]);

    const contas = await pessoasDoClerk(clerk).contasCom([
      marcar(ehEmail, "ana@x.com"),
    ]);

    expect([...contas]).toEqual([]);
  });

  test("acha a conta pelo e-mail inteiro, sem caixa, principal ou não", async () => {
    const clerk = clerkCom([
      comEmails("user_diana", "diana@x.com"),
      comEmails("user_ana", "pessoal@y.com", "Ana@X.com"),
    ]);

    const contas = await pessoasDoClerk(clerk).contasCom([
      marcar(ehEmail, "ana@x.com"),
      marcar(ehEmail, "bia@x.com"),
    ]);

    expect([...contas]).toEqual([[marcar(ehEmail, "ana@x.com"), "user_ana"]]);
  });

  test("segue pelas páginas quando o trecho casa mais gente que o limite", async () => {
    const parecidas = Array.from({ length: 100 }, (_, i) =>
      comEmails(`user_d${i}`, `d${i}ana@x.com`)
    );

    const pedidos: { offset?: number }[] = [];

    const clerk = clerkCom(
      [...parecidas, comEmails("user_ana", "ana@x.com")],
      pedidos
    );

    const contas = await pessoasDoClerk(clerk).contasCom([
      marcar(ehEmail, "ana@x.com"),
    ]);

    expect(contas.get(marcar(ehEmail, "ana@x.com"))).toBe("user_ana");
    expect(pedidos.map((p) => p.offset)).toEqual([0, 100]);
  });

  test("a lista vazia não chega ao Clerk, que leria sem filtro", async () => {
    const pedidos: unknown[] = [];
    const contas = await pessoasDoClerk(clerkCom([], pedidos)).contasCom([]);
    expect([...contas]).toEqual([]);
    expect(pedidos).toEqual([]);
  });
});

describe("pessoasDoClerk.buscar entre userIds", () => {
  test("a lista vazia não chega ao Clerk, que leria sem filtro", async () => {
    let chamadas = 0;

    const clerk = clerkQueLista(() => {
      chamadas += 1;

      return Promise.resolve({ data: [], totalCount: 0 });
    });

    expect(await pessoasDoClerk(clerk).buscar("", [])).toEqual({
      pessoas: [],
      total: 0,
    });
    expect(chamadas).toBe(0);
  });

  test("os userIds vão no filtro do Clerk junto com o termo", async () => {
    const pedidos: unknown[] = [];

    const clerk = clerkQueLista((p: unknown) => {
      pedidos.push(p);

      return Promise.resolve({ data: [], totalCount: 0 });
    });

    await pessoasDoClerk(clerk).buscar("ana", ["user_a", "user_b"]);
    expect(pedidos).toEqual([
      { limit: 20, query: "ana", userId: ["user_a", "user_b"] },
    ]);
  });
});
