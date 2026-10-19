import { describe, expect, test } from "bun:test";

import { type ContaParaEntrar, podeDesconectarOGoogle } from "./entrada";

// O linkedTo do e-mail aponta para a identificação do Google, não para a conta.
const GOOGLE = { id: "eac_1", identificationId: "idn_g", provider: "google" };

const conta = (c: Partial<ContaParaEntrar>): ContaParaEntrar => ({
  emailAddresses: [],
  externalAccounts: [GOOGLE],
  passwordEnabled: false,
  ...c,
});

const email = (status: string, ligadoA: string[] = []) => ({
  id: `idn_${status}_${ligadoA.length}`,
  linkedTo: ligadoA.map((id) => ({ id })),
  verification: { status },
});

describe("podeDesconectarOGoogle", () => {
  test("sem o Google conectado, não há o que desconectar", () => {
    expect(podeDesconectarOGoogle(conta({ externalAccounts: [] }))).toBe(false);
  });

  test("com a senha, a pessoa ainda entra", () => {
    expect(podeDesconectarOGoogle(conta({ passwordEnabled: true }))).toBe(true);
  });

  test("com um e-mail confirmado que não veio do Google, a pessoa entra pelo código", () => {
    expect(
      podeDesconectarOGoogle(conta({ emailAddresses: [email("verified")] }))
    ).toBe(true);
  });

  test("só com o e-mail do próprio Google, ou um não confirmado, fica", () => {
    expect(
      podeDesconectarOGoogle(
        conta({
          emailAddresses: [
            email("verified", [GOOGLE.identificationId]),
            email("unverified"),
          ],
        })
      )
    ).toBe(false);
  });
});
