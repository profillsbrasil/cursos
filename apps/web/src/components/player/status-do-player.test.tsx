import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { StatusDoPlayer } from "./status-do-player";

const POSICIONADO = /\b(fixed|absolute|sticky)\b/;
const CONQUISTA = { bonusSequencia: null, pontos: 10, sequenciaDias: 1 };

const html = (props: Parameters<typeof StatusDoPlayer>[0]) =>
  renderToStaticMarkup(<StatusDoPlayer {...props} />);

describe("linha de status do player", () => {
  test("a conquista é uma linha no fluxo, com role=status, nunca fixa", () => {
    const h = html({ conquista: CONQUISTA, envio: { tipo: "em_dia" } });
    expect(h).toContain('role="status"');
    expect(h).toContain("Aula assistida");
    expect(h).toContain("Você viu 90% dos trechos desta aula.");
    expect(h).toContain("+10 pts");
    expect(h).not.toMatch(POSICIONADO);
  });

  test("o bônus de sequência entra na mesma linha", () => {
    const h = html({
      conquista: { bonusSequencia: 30, pontos: 10, sequenciaDias: 7 },
      envio: { tipo: "em_dia" },
    });
    expect(h).toContain("Sequência de 7 dias úteis: +30 pts.");
  });

  test("esperando nova tentativa mostra que o progresso não foi salvo", () => {
    const h = html({
      conquista: null,
      envio: { tentativa: 2, tipo: "esperando_nova_tentativa" },
    });
    expect(h).toContain("Progresso não salvo. Tentando de novo.");
  });

  test("a nova tentativa em voo continua mostrando que o progresso não foi salvo", () => {
    const h = html({
      conquista: null,
      envio: { tentativa: 1, tipo: "enviando" },
    });
    expect(h).toContain("Progresso não salvo. Tentando de novo.");
  });

  test("primeiro envio, pendente e em dia não mostram nada", () => {
    for (const envio of [
      { tentativa: 0, tipo: "enviando" },
      { tipo: "pendente" },
      { tipo: "em_dia" },
    ] as const) {
      const h = html({ conquista: null, envio });
      expect(h).not.toContain("Progresso");
      expect(h).not.toContain("Aula assistida");
    }
  });
});
