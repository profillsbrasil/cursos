import { describe, expect, test } from "bun:test";
import { ClerkAPIResponseError, ClerkRuntimeError } from "@clerk/nextjs/errors";

import { FRASE_GENERICA, fraseDoErro } from "./erros";

const doClerk = (code: string, status = 422) =>
  new ClerkAPIResponseError("erro", {
    data: [{ code, long_message: "", message: "" }],
    status,
  });

describe("fraseDoErro", () => {
  test.each([
    ["form_password_incorrect", "A senha atual está errada."],
    ["form_password_validation_failed", "A senha atual está errada."],
    [
      "form_password_pwned",
      "Esta senha apareceu num vazamento de dados. Escolha outra.",
    ],
    [
      "form_password_length_too_short",
      "A senha precisa de 15 caracteres ou mais.",
    ],
    ["form_identifier_exists", "Este e-mail já está em outra conta."],
    [
      "form_code_incorrect",
      "Código errado. Confira o e-mail e digite de novo.",
    ],
    ["verification_expired", "O código venceu. Peça outro."],
    [
      "too_many_requests",
      "Muitas tentativas seguidas. Espere um minuto e tente de novo.",
    ],
  ])("o código %s vira frase em pt-BR", (codigo, frase) => {
    expect(fraseDoErro(doClerk(codigo))).toBe(frase);
  });

  test("a reverificação cancelada diz que nada mudou", () => {
    const cancelada = new ClerkRuntimeError("cancelada", {
      code: "reverification_cancelled",
    });
    expect(fraseDoErro(cancelada)).toBe(
      "Você não confirmou quem é, então nada mudou."
    );
  });

  test("o 429 sem código conhecido vira excesso de tentativas", () => {
    expect(fraseDoErro(doClerk("rate_limit_exceeded", 429))).toBe(
      "Muitas tentativas seguidas. Espere um minuto e tente de novo."
    );
  });

  test("código desconhecido, erro de rede e o que não é do Clerk viram a genérica", () => {
    expect(fraseDoErro(doClerk("codigo_novo_do_clerk"))).toBe(FRASE_GENERICA);
    expect(fraseDoErro(new TypeError("Failed to fetch"))).toBe(FRASE_GENERICA);
    expect(fraseDoErro("texto")).toBe(FRASE_GENERICA);
  });
});
