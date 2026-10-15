import { describe, expect, test } from "bun:test";

import {
  diaCurto,
  duracaoDoTexto,
  fmtData,
  fmtDiaCurto,
  fmtPtsComSinal,
  mmss,
  quando,
} from "./formato";

describe("os dois formatos de data", () => {
  const hoje = "2026-10-15";

  test("o curto é o mesmo vindo de um dia ou de um instante", () => {
    expect(diaCurto("2026-10-07", hoje)).toBe("7 de out.");
    expect(fmtDiaCurto("2026-10-07T15:00:00.000Z")).toBe("7 de out.");
    expect(diaCurto("2026-05-02", hoje)).toBe("2 de mai.");
  });

  test("o curto de outro ano leva o ano", () => {
    expect(diaCurto("2025-09-21", hoje)).toBe("21 de set. de 2025");
  });

  test("o longo escreve o mês inteiro e o ano", () => {
    expect(fmtData("2026-08-20T15:00:00.000Z")).toBe("20 de agosto de 2026");
  });

  test("o instante cai no dia de São Paulo", () => {
    expect(fmtDiaCurto("2026-10-08T02:00:00.000Z")).toBe("7 de out.");
  });
});

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
    expect(quando("2026-09-30", hoje)).toBe("30 de set.");
    expect(quando("2025-12-31", hoje)).toBe("31 de dez. de 2025");
  });

  test("a virada de mês e o horário de verão não mudam a conta", () => {
    expect(quando("2026-10-31", "2026-11-01")).toBe("Ontem");
    expect(quando("2026-02-28", "2026-03-01")).toBe("Ontem");
  });
});
