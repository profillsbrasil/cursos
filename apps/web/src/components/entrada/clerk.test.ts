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

  // O cartão de entrada não pode vazar para o <UserProfile> e o <UserButton>.
  test("o estilo do cartão vale só no login e no cadastro", () => {
    expect(APARENCIA_CLERK).not.toHaveProperty("elements");
    expect(APARENCIA_CLERK).not.toHaveProperty("options");
    expect(APARENCIA_CLERK.signIn).toBe(APARENCIA_CLERK.signUp);
  });
});
