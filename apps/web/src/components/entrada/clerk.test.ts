import { describe, expect, test } from "bun:test";

import { PRODUTO } from "@/lib/marca";

import { APARENCIA_CLERK, TEXTOS_CLERK } from "./clerk";

describe("textos e aparência do Clerk", () => {
  test("nenhum texto mostra o nome da instância no Clerk", () => {
    const texto = JSON.stringify(TEXTOS_CLERK);
    expect(texto).not.toContain("{{applicationName}}");
    expect(TEXTOS_CLERK.signIn.start.titleCombined).toContain(PRODUTO);
  });

  // O cartão de entrada não pode vazar para o <UserProfile> e o <UserButton>.
  test("o estilo do cartão vale só no login e no cadastro", () => {
    expect(APARENCIA_CLERK).not.toHaveProperty("elements");
    expect(APARENCIA_CLERK).not.toHaveProperty("options");
    expect(APARENCIA_CLERK.signIn).toBe(APARENCIA_CLERK.signUp);
  });
});
