import { describe, expect, test } from "bun:test";

import { FRASES_DO_NOME, problemaDoNome } from "./nome";

describe("problemaDoNome", () => {
  test.each([
    ["Ana", "Souza"],
    ["D'Ávila", "Souza-Lima"],
    ["😀 -5", "Quebra"],
    ["José 2º", "Neto"],
  ])("aceita %p %p", (nome, sobrenome) => {
    expect(problemaDoNome(nome, sobrenome)).toBeNull();
  });

  test("o nome do teste de usabilidade, com tag de HTML, cai nos sinais", () => {
    expect(problemaDoNome("<b>html</b> 😀 -5", "Quebra")).toEqual({
      campos: ["nome"],
      frase: FRASES_DO_NOME.sinais,
    });
  });

  test.each([["a<b"], ["a > b"], ["&amp;"], ["Tom & Jerry"]])(
    "recusa %p pelos sinais",
    (sobrenome) => {
      expect(problemaDoNome("Ana", sobrenome)).toEqual({
        campos: ["sobrenome"],
        frase: FRASES_DO_NOME.sinais,
      });
    }
  );

  test("recusa endereço de site e diz em que campo está", () => {
    expect(problemaDoNome("https://x.com", "ftp://y")).toEqual({
      campos: ["nome", "sobrenome"],
      frase: FRASES_DO_NOME.site,
    });
  });
});
