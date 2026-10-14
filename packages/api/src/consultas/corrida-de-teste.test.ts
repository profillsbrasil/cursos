import { describe, expect, test } from "bun:test";
import { urlDaCorrida } from "./corrida-de-teste";

describe("urlDaCorrida", () => {
  test("sem banco de teste devolve vazio, sem lançar", () => {
    expect(urlDaCorrida(null)).toBe("");
    expect(urlDaCorrida("")).toBe("");
  });

  test("com banco de teste acrescenta um application_name desta execução", () => {
    const url = new URL(urlDaCorrida("postgresql://127.0.0.1:54322/postgres"));
    expect(url.host).toBe("127.0.0.1:54322");
    expect(url.pathname).toBe("/postgres");
    expect(url.searchParams.get("application_name")).toMatch(
      /^corrida-[0-9a-f]{8}$/
    );
  });
});
