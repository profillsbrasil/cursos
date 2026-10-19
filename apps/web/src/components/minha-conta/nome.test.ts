import { describe, expect, test } from "bun:test";

import {
  FRASES_DO_NOME,
  LIMITE_DA_PALAVRA,
  LIMITE_DO_NOME,
  problemaDoNome,
} from "./nome";

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

  test("o nome de 256 letras sem espaço do teste de usabilidade passa da palavra", () => {
    expect(problemaDoNome("A".repeat(256), "Quebra")).toEqual({
      campos: ["nome"],
      frase: FRASES_DO_NOME.palavra,
    });
  });

  test("a palavra vai até 20 letras, e o limite é o que a folha comporta", () => {
    expect(LIMITE_DA_PALAVRA).toBe(20);
    expect(problemaDoNome("A".repeat(20), "Souza")).toBeNull();
    expect(problemaDoNome("Ana", `Souza ${"b".repeat(21)}`)).toEqual({
      campos: ["sobrenome"],
      frase: FRASES_DO_NOME.palavra,
    });
  });

  test("nome e sobrenome juntos vão até 100 caracteres, com o espaço do meio", () => {
    expect(LIMITE_DO_NOME).toBe(100);
    const metade = "Albuquerque Figueiredo Cavalcanti Vasconcelos ";
    const nome = `${metade}Maria`.slice(0, 49);
    expect(problemaDoNome(nome, "x".repeat(10).padEnd(50, " y"))).toBeNull();
    expect(problemaDoNome(nome, "Souza ".repeat(9).trim())).toEqual({
      campos: ["nome", "sobrenome"],
      frase: FRASES_DO_NOME.comprimento,
    });
  });

  test.each([[""], ["   "]])("o nome %p, vazio, pede o nome", (nome) => {
    expect(problemaDoNome(nome, "Souza")).toEqual({
      campos: ["nome"],
      frase: FRASES_DO_NOME.vazio,
    });
  });

  test("o sobrenome vazio vale", () => {
    expect(problemaDoNome("Ana", "")).toBeNull();
  });
});
