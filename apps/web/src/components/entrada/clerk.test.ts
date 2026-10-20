import { describe, expect, test } from "bun:test";

import { PRODUTO } from "@/lib/marca";

import { APARENCIA_CLERK, TEXTOS_CLERK } from "./clerk";

describe("textos e aparência do Clerk", () => {
  test("nenhum texto mostra o nome da instância no Clerk", () => {
    const texto = JSON.stringify(TEXTOS_CLERK);
    expect(texto).not.toContain("{{applicationName}}");
    expect(TEXTOS_CLERK.signIn.start.titleCombined).toContain(PRODUTO);
  });

  // A instância do Clerk não pede nome no cadastro (só e-mail e senha, ou o
  // Google), e o subtítulo dizia "O nome sai no certificado" sobre um formulário
  // sem nome (r1/novo/02). O nome do certificado se edita em Minha conta.
  test("o subtítulo do cadastro manda o nome para Minha conta", () => {
    const { subtitle } = TEXTOS_CLERK.signUp.start;
    expect(subtitle).toContain("Minha conta");
    expect(subtitle).not.toContain("O nome sai no certificado");
  });

  // O Clerk procura a recusa da API em unstable__errors.<code> e, sem a chave,
  // mostra o long_message em inglês ("This sign in token has already been
  // used..."). O ptBR do @clerk/localizations não traz os códigos do link de
  // entrada. Os códigos são os da doc de erros da Frontend API do Clerk.
  test("toda recusa do link de entrada tem texto em português", () => {
    const erros: Record<string, unknown> = TEXTOS_CLERK.unstable__errors;
    const sem = [
      "sign_in_token_already_used_code",
      "sign_in_token_cannot_be_used_code",
      "sign_in_token_not_in_sign_in_code",
      "sign_in_token_revoked_code",
      "ticket_expired_code",
      "ticket_invalid_code",
    ].filter((codigo) => typeof erros[codigo] !== "string" || !erros[codigo]);
    expect(sem).toEqual([]);
  });

  // O cartão de entrada não pode vazar para o <UserProfile> e o <UserButton>.
  test("o estilo do cartão vale só no login e no cadastro", () => {
    expect(APARENCIA_CLERK).not.toHaveProperty("elements");
    expect(APARENCIA_CLERK).not.toHaveProperty("options");
    expect(APARENCIA_CLERK.signIn).toBe(APARENCIA_CLERK.signUp);
  });

  test("os textos levam só as telas que o app desenha", () => {
    expect(JSON.stringify(TEXTOS_CLERK).length).toBeLessThan(30_000);
    expect(TEXTOS_CLERK).not.toHaveProperty("userProfile");
    expect(TEXTOS_CLERK).not.toHaveProperty("organizationProfile");
    expect(TEXTOS_CLERK.reverification).toBeDefined();
    expect(TEXTOS_CLERK.formButtonPrimary).toBe("Continuar");
  });
});
