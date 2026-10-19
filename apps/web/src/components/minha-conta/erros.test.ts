import { describe, expect, test } from "bun:test";
import { ClerkAPIResponseError, ClerkRuntimeError } from "@clerk/nextjs/errors";

import { FRASE_GENERICA, fraseDoErro } from "./erros";
import { FRASES_DO_NOME } from "./nome";

const doClerk = (code: string, status = 422) =>
  new ClerkAPIResponseError("erro", {
    data: [{ code, long_message: "", message: "" }],
    status,
  });

// A recusa que o Clerk devolveu ao nome "<b>html</b> 😀 -5" (medida no POST /v1/users).
const nomeRecusado = (param_name: string, long_message: string) =>
  new ClerkAPIResponseError("erro", {
    data: [
      {
        code: "form_param_value_invalid",
        long_message,
        message: "is invalid",
        meta: { param_name },
      },
    ],
    status: 422,
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

  test("o nome com HTML que o Clerk recusa diz a regra dos sinais", () => {
    expect(
      fraseDoErro(
        nomeRecusado(
          "first_name",
          'The first name "<b>html</b> 😀 -5" is invalid: contains HTML tags'
        )
      )
    ).toBe(FRASES_DO_NOME.sinais);
  });

  test("o sobrenome com site que o Clerk recusa diz a regra do site", () => {
    expect(
      fraseDoErro(
        nomeRecusado(
          "last_name",
          'The last name "https://x.com" is invalid: contains a URL'
        )
      )
    ).toBe(FRASES_DO_NOME.site);
  });

  test("outra recusa do nome diz o que o nome aceita", () => {
    expect(
      fraseDoErro(nomeRecusado("first_name", "is invalid: something new"))
    ).toBe(FRASES_DO_NOME.recusado);
  });
});
