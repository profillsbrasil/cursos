import { describe, expect, test } from "bun:test";

import { duracaoDoTexto, fmtPtsComSinal, mmss, quando } from "./formato";

describe("duracaoDoTexto", () => {
  test("mm:ss e h:mm:ss viram segundos", () => {
    expect(duracaoDoTexto("12:30")).toBe(750);
    expect(duracaoDoTexto("0:45")).toBe(45);
    expect(duracaoDoTexto(" 7:05 ")).toBe(425);
    expect(duracaoDoTexto("90:00")).toBe(5400);
    expect(duracaoDoTexto("1:02:03")).toBe(3723);
  });

  test("volta do mmss sem perder nada", () => {
    for (const seg of [1, 59, 60, 754, 5999, 86_400]) {
      expect(duracaoDoTexto(mmss(seg))).toBe(seg);
    }
  });

  test("recusa o que não é duração de aula", () => {
    for (const texto of [
      "",
      "12",
      "12:3",
      "12:60",
      "1:60:00",
      "00:00",
      "-1:00",
      "1,5:00",
      "abc",
      "24:00:01",
    ]) {
      expect(duracaoDoTexto(texto)).toBeNull();
    }
  });
});

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
