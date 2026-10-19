import { describe, expect, test } from "bun:test";

import { aparelhosDe, quandoFoi, type SessaoDoClerk } from "./aparelhos";

// Segunda, 19 de outubro de 2026, 14h05 em São Paulo.
const AGORA = new Date("2026-10-19T17:05:00Z");

const sessao = (
  id: string,
  quando: string,
  atividade: SessaoDoClerk["latestActivity"] = {
    browserName: "Chrome",
    city: "Curitiba",
    deviceType: "Windows",
  }
): SessaoDoClerk => ({
  id,
  lastActiveAt: new Date(quando),
  latestActivity: atividade,
});

describe("quandoFoi", () => {
  test("hoje, ontem e o dia da semana levam a hora de São Paulo", () => {
    expect(quandoFoi(new Date("2026-10-19T13:32:00Z"), AGORA)).toBe(
      "hoje às 10h32"
    );
    expect(quandoFoi(new Date("2026-10-18T22:40:00Z"), AGORA)).toBe(
      "ontem às 19h40"
    );
    expect(quandoFoi(new Date("2026-10-15T13:32:00Z"), AGORA)).toBe(
      "quinta às 10h32"
    );
  });

  test("a virada do dia é a de São Paulo, não a de UTC", () => {
    // 01h30 em UTC do dia 19 ainda é 22h30 do dia 18 em São Paulo.
    expect(quandoFoi(new Date("2026-10-19T01:30:00Z"), AGORA)).toBe(
      "ontem às 22h30"
    );
  });

  test("uma semana ou mais vira a data curta, com o ano quando muda", () => {
    expect(quandoFoi(new Date("2026-10-02T15:00:00Z"), AGORA)).toBe(
      "2 de out."
    );
    expect(quandoFoi(new Date("2025-12-28T15:00:00Z"), AGORA)).toBe(
      "28 de dez. de 2025"
    );
  });
});

describe("aparelhosDe", () => {
  const sessoes = [
    sessao("velha", "2026-10-02T15:00:00Z"),
    sessao("atual", "2026-10-19T17:04:00Z", {
      browserName: "Chrome",
      city: "São Paulo",
      deviceType: "X11",
    }),
    sessao("ontem", "2026-10-18T22:40:00Z", {
      browserName: "Safari",
      city: "Campinas",
      deviceType: "iPhone",
      isMobile: true,
    }),
    sessao("quinta", "2026-10-15T13:32:00Z"),
    sessao("quarta", "2026-10-14T23:03:00Z", {
      browserName: "Safari",
      deviceType: "Macintosh",
    }),
    sessao("hoje", "2026-10-19T12:00:00Z", {}),
  ];
  const a = aparelhosDe(sessoes, "atual", AGORA);

  test("a sessão desta aba fica à parte, agora", () => {
    expect(a.atual).toEqual({
      celular: false,
      id: "atual",
      nome: "Chrome no Linux",
      onde: "São Paulo · agora",
    });
  });

  test("as outras vão do acesso mais novo ao mais velho, três à vista", () => {
    expect(a.recentes.map((r) => [r.nome, r.onde, r.celular])).toEqual([
      ["Computador", "hoje às 09h00", false],
      ["Safari no iPhone", "Campinas · ontem às 19h40", true],
      ["Chrome no Windows", "Curitiba · quinta às 10h32", false],
    ]);
    expect(a.antigos.map((r) => [r.id, r.onde])).toEqual([
      ["quarta", "quarta às 20h03"],
      ["velha", "Curitiba · 2 de out."],
    ]);
  });

  test("sem a sessão desta aba na lista, todas são as outras", () => {
    const sem = aparelhosDe(sessoes.slice(0, 2), "outra", AGORA);
    expect(sem.atual).toBeNull();
    expect(sem.recentes.map((r) => r.id)).toEqual(["atual", "velha"]);
    expect(sem.antigos).toEqual([]);
  });
});
