import { describe, expect, test } from "bun:test";

import { escreverMultirange, lerMultirange } from "./tipos-pg";

describe("int4multirange", () => {
  test("vazio vai e volta", () => {
    expect(lerMultirange("{}")).toEqual([]);
    expect(escreverMultirange([])).toBe("{}");
  });

  test("várias faixas vão e voltam", () => {
    const texto = "{[0,30),[45,90)}";
    const faixas = [
      { fim: 30, inicio: 0 },
      { fim: 90, inicio: 45 },
    ];
    expect(lerMultirange(texto)).toEqual(faixas);
    expect(escreverMultirange(faixas)).toBe(texto);
  });

  test("texto fora do formato lança", () => {
    expect(() => lerMultirange("{(0,30]}")).toThrow();
  });
});
