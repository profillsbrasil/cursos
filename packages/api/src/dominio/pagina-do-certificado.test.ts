import { describe, expect, test } from "bun:test";

import { cargaHoraria, nomeNoCertificado } from "./pagina-do-certificado";

describe("cargaHoraria", () => {
  test.each([
    [1, 1],
    [3599, 1],
    [3600, 1],
    [3601, 2],
    // Fábrica e montagem do protótipo: 7 aulas de 10:34 somam 1 h 14 min.
    [7 * 634, 2],
    [10 * 3600, 10],
  ])("%p s dão %p h", (segundos, horas) => {
    expect(cargaHoraria(segundos)).toBe(horas);
  });
});

describe("nomeNoCertificado", () => {
  const ana = {
    email: "ana@profills.com.br",
    foto: null,
    nome: "Ana Souza",
    userId: "user_ana",
  };

  test("o nome da conta vai para a folha", () => {
    expect(nomeNoCertificado(ana)).toBe("Ana Souza");
  });

  test("a conta só com e-mail não põe o e-mail na folha", () => {
    expect(nomeNoCertificado({ ...ana, nome: "ana@profills.com.br" })).toBe(
      null
    );
  });

  test("a conta sem nome nem e-mail não põe o userId na folha", () => {
    expect(nomeNoCertificado({ ...ana, email: null, nome: "user_ana" })).toBe(
      null
    );
  });

  test("a pessoa que o Clerk não conhece fica sem nome", () => {
    expect(nomeNoCertificado(null)).toBeNull();
  });
});
