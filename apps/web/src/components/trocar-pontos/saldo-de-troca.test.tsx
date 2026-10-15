import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SaldoDeTroca } from "./saldo-de-troca";

const texto = (h: string) =>
  h
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** O cartão do saldo até o botão, sem o painel de Como ganhar pontos. */
const saldo = (pontosSemana: number) =>
  `${
    texto(
      renderToStaticMarkup(
        <SaldoDeTroca
          comoGanhar={[]}
          pontosSemana={pontosSemana}
          saldo={610}
          temCursoTrocavelNaVitrine={false}
        />
      )
    ).split("Como ganhar pontos")[0]
  }Como ganhar pontos`;

describe("o selo dos pontos da semana em Trocar pontos", () => {
  test("com 0 pts na semana, o selo some e o saldo fica sozinho", () => {
    const t = saldo(0);
    expect(t).toBe("Seu saldo 610 pts Como ganhar pontos");
    expect(t).not.toContain("nesta semana");
  });

  test("com pontos na semana, o selo aparece", () => {
    expect(saldo(40)).toBe(
      "Seu saldo 610 pts +40 pts nesta semana Como ganhar pontos"
    );
  });
});
