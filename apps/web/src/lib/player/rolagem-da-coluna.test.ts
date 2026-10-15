import { describe, expect, test } from "bun:test";

import { rolagemDaColuna } from "./rolagem-da-coluna";

describe("rolagemDaColuna", () => {
  test("centra a aula atual no meio da coluna", () => {
    // Aula de 40 px a 1500 px do topo, coluna de 678 px que rola por 2400 px:
    // o centro da aula (1520) fica no centro da janela (339).
    expect(
      rolagemDaColuna({
        alturaDaAula: 40,
        alturaDoConteudo: 2400,
        alturaVisivel: 678,
        topoDaAula: 1500,
      })
    ).toBe(1181);
  });

  test("não rola acima do topo quando a aula está no começo", () => {
    expect(
      rolagemDaColuna({
        alturaDaAula: 40,
        alturaDoConteudo: 2400,
        alturaVisivel: 678,
        topoDaAula: 120,
      })
    ).toBe(0);
  });

  test("para no fim quando a aula está no pé da lista", () => {
    expect(
      rolagemDaColuna({
        alturaDaAula: 40,
        alturaDoConteudo: 2400,
        alturaVisivel: 678,
        topoDaAula: 2340,
      })
    ).toBe(1722);
  });

  test("arredonda para o pixel inteiro", () => {
    expect(
      rolagemDaColuna({
        alturaDaAula: 41,
        alturaDoConteudo: 2400,
        alturaVisivel: 677,
        topoDaAula: 1000,
      })
    ).toBe(682);
  });

  test("não mexe na coluna que não rola sozinha (no celular, no fluxo da página)", () => {
    expect(
      rolagemDaColuna({
        alturaDaAula: 40,
        alturaDoConteudo: 2400,
        alturaVisivel: 2400,
        topoDaAula: 1500,
      })
    ).toBeNull();
  });
});
