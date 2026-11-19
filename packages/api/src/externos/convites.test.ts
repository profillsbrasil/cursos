import { describe, expect, spyOn, test } from "bun:test";

import { ClerkAPIResponseError } from "@clerk/backend/errors";

import { email } from "../dominio/marcas";
import { type ClerkDosConvites, convitesDoClerk } from "./convites";

const AGORA = new Date("2026-11-11T15:00:00Z");
const ANA = email("ana@exemplo.com");
const CRIAR_CONTA = "https://cursos.exemplo.com/criar-conta";

const NENHUM_CONVITE: ClerkDosConvites["invitations"] = {
  createInvitation: () =>
    Promise.reject(new Error("o teste não esperava criar convite")),
  revokeInvitation: () =>
    Promise.reject(new Error("o teste não esperava revogar convite")),
};

const clerkQue = (
  invitations: Partial<ClerkDosConvites["invitations"]>
): ClerkDosConvites => ({ invitations: { ...NENHUM_CONVITE, ...invitations } });

const recusa = (status: number, retryAfter?: number) =>
  new ClerkAPIResponseError("recusa do Clerk", {
    data: [],
    retryAfter,
    status,
  });

describe("convitesDoClerk.enviar", () => {
  test("manda o e-mail com o link de criar conta, sem metadata, e devolve o id do Clerk", async () => {
    const pedidos: unknown[] = [];

    const convites = convitesDoClerk(
      clerkQue({
        createInvitation: (pedido: unknown) => {
          pedidos.push(pedido);

          return Promise.resolve({ id: "inv_1", status: "pending" });
        },
      }),
      { criarConta: CRIAR_CONTA }
    );

    expect(await convites.enviar(ANA, AGORA)).toEqual({
      clerkConviteId: "inv_1",
      tipo: "enviado",
    });
    expect(pedidos).toEqual([
      {
        emailAddress: "ana@exemplo.com",
        expiresInDays: 30,
        ignoreExisting: true,
        notify: true,
        redirectUrl: CRIAR_CONTA,
      },
    ]);
  });

  test("o 429 vira limite, com a volta no Retry-After", async () => {
    const convites = convitesDoClerk(
      clerkQue({ createInvitation: () => Promise.reject(recusa(429, 120)) }),
      { criarConta: CRIAR_CONTA }
    );

    expect(await convites.enviar(ANA, AGORA)).toEqual({
      tentarEm: new Date("2026-11-11T15:02:00Z"),
      tipo: "limite",
    });
  });

  test("o 429 sem Retry-After volta em uma hora", async () => {
    const convites = convitesDoClerk(
      clerkQue({ createInvitation: () => Promise.reject(recusa(429)) }),
      { criarConta: CRIAR_CONTA }
    );

    expect(await convites.enviar(ANA, AGORA)).toEqual({
      tentarEm: new Date("2026-11-11T16:00:00Z"),
      tipo: "limite",
    });
  });

  test("qualquer outra falha lança", async () => {
    const erros = [recusa(422), new Error("fetch failed")];

    const lancados = await Promise.all(
      erros.map((erro) =>
        convitesDoClerk(
          clerkQue({ createInvitation: () => Promise.reject(erro) }),
          { criarConta: CRIAR_CONTA }
        )
          .enviar(ANA, AGORA)
          .then(
            () => null,
            (lancado: unknown) => lancado
          )
      )
    );

    expect(lancados.map((lancado, i) => lancado === erros[i])).toEqual([
      true,
      true,
    ]);
  });
});

describe("convitesDoClerk.revogar", () => {
  test("revoga o convite do Clerk pelo id", async () => {
    const revogados: string[] = [];

    const convites = convitesDoClerk(
      clerkQue({
        revokeInvitation: (id: string) => {
          revogados.push(id);

          return Promise.resolve({ id, status: "revoked" });
        },
      }),
      { criarConta: CRIAR_CONTA }
    );

    await convites.revogar("inv_1");
    expect(revogados).toEqual(["inv_1"]);
  });

  test("não lança quando o Clerk recusa: o link já foi revogado, aceito ou expirou", async () => {
    const aviso = spyOn(console, "warn");

    try {
      const convites = convitesDoClerk(
        clerkQue({ revokeInvitation: () => Promise.reject(recusa(400)) }),
        { criarConta: CRIAR_CONTA }
      );

      await expect(convites.revogar("inv_1")).resolves.toBeUndefined();
      expect(aviso).toHaveBeenCalledTimes(1);
    } finally {
      aviso.mockRestore();
    }
  });
});
