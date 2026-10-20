import { describe, expect, test } from "bun:test";

import { perfilDoCadastro } from "./perfil";

describe("perfilDoCadastro", () => {
  test("e-mail verificado da Profills entra como funcionário", () => {
    expect(
      perfilDoCadastro({
        email: "Ana.Ribeiro@Profills.com",
        emailVerificado: true,
      })
    ).toBe("funcionario");
  });

  test("e-mail da Profills por verificar entra como público aberto", () => {
    expect(
      perfilDoCadastro({ email: "ana@profills.com", emailVerificado: false })
    ).toBe("publico");
  });

  test("domínio que só termina parecido não é da Profills", () => {
    expect(
      perfilDoCadastro({ email: "ana@naoprofills.com", emailVerificado: true })
    ).toBe("publico");
    expect(
      perfilDoCadastro({
        email: "ana@profills.com.br",
        emailVerificado: true,
      })
    ).toBe("publico");
  });

  test("sem e-mail ou sem conta, público aberto", () => {
    expect(perfilDoCadastro({ email: null, emailVerificado: true })).toBe(
      "publico"
    );
    expect(perfilDoCadastro(null)).toBe("publico");
  });
});
