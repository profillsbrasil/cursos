import { describe, expect, test } from "bun:test";
import type { ClerkClient, User } from "@clerk/backend";

import { paraPessoa, pessoasDoClerk } from "./pessoas";

function usuario(parcial: Partial<User>): User {
  return {
    fullName: null,
    hasImage: false,
    id: "user_ana",
    imageUrl: "https://img.clerk.com/padrao",
    primaryEmailAddress: null,
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
