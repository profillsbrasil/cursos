import { describe, expect, test } from "bun:test";

import { fmtPtsComSinal, quando } from "./formato";

describe("fmtPtsComSinal", () => {
  test("entrada leva +, saída leva o menos tipográfico e milhar com ponto", () => {
    expect(fmtPtsComSinal(10)).toBe("+10 pts");
    expect(fmtPtsComSinal(-300)).toBe("−300 pts");
    expect(fmtPtsComSinal(-2340)).toBe("−2.340 pts");
  });
});

describe("quando", () => {
  const hoje = "2026-10-07";

  test("hoje e ontem por nome", () => {
    expect(quando("2026-10-07", hoje)).toBe("Hoje");
    expect(quando("2026-10-06", hoje)).toBe("Ontem");
  });

  test("de 2 a 6 dias atrás, o dia da semana", () => {
    expect(quando("2026-10-05", hoje)).toBe("Seg");
    expect(quando("2026-10-04", hoje)).toBe("Dom");
    expect(quando("2026-10-01", hoje)).toBe("Qui");
  });

  test("7 dias ou mais, dia e mês; outro ano leva o ano", () => {
    expect(quando("2026-09-30", hoje)).toBe("30 set");
    expect(quando("2025-12-31", hoje)).toBe("31 dez 2025");
  });

  test("a virada de mês e o horário de verão não mudam a conta", () => {
    expect(quando("2026-10-31", "2026-11-01")).toBe("Ontem");
    expect(quando("2026-02-28", "2026-03-01")).toBe("Ontem");
  });
});
