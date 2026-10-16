import { describe, expect, test } from "bun:test";
import { comoGanhar } from "@cursos/api/dominio/pontos";
import { renderToStaticMarkup } from "react-dom/server";

import { ComoGanhar } from "./como-ganhar";
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

describe("Como ganhar pontos", () => {
  const painel = texto(
    renderToStaticMarkup(
      <ComoGanhar aberta id="como-ganhar" regras={comoGanhar()} />
    )
  );

  test("diz que só a primeira tentativa do questionário pontua, sem falar em prova", () => {
    expect(painel).toContain(
      "Rever aula não pontua de novo, e o questionário pontua só na primeira tentativa."
    );
    expect(painel).not.toContain("prova");
  });
});
