import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { StatusDoPlayer } from "./status-do-player";

const POSICIONADO = /\b(fixed|absolute|sticky)\b/;
const CONQUISTA = { bonusSequencia: null, pontos: 10, sequenciaDias: 1 };
const ESCONDE = /(^|[\s:])(hidden|invisible|sr-only)(\s|$)/;

const html = (props: Parameters<typeof StatusDoPlayer>[0]) =>
  renderToStaticMarkup(<StatusDoPlayer {...props} />);

const VISTO = /<span class="([^"]*)"[^>]*tabindex="0"[^>]*>/;
const caixaDoVisto = (h: string) => h.match(VISTO)?.[1] ?? "";
const AVISO = /<p class="([^"]*)"><b/;
const caixaDoAviso = (h: string) => h.match(AVISO)?.[1] ?? "";
const REGIAO = /<div class="([^"]*)" role="status">/;
const regiao = (h: string) => h.match(REGIAO)?.[1];

describe("o visto e o aviso da conquista na barra", () => {
  test("sem conquista, o visto mostra a porcentagem e recebe o foco de teclado, e a região de status existe", () => {
    const h = html({ avisoAparente: false, conquista: null, pct: 42 });
    expect(h).toContain("42%");
    expect(h).toContain("visto");
    expect(h).toMatch(VISTO);
    expect(caixaDoVisto(h)).not.toMatch(ESCONDE);
    expect(regiao(h)).toBeDefined();
    expect(regiao(h)).not.toMatch(ESCONDE);
  });

  test("o foco de teclado no visto ganha o fundo do cursor", () => {
    expect(
      caixaDoVisto(html({ avisoAparente: false, conquista: null, pct: 0 }))
    ).toContain("hover:bg-accent");
  });

  test("o aviso aparece no lugar do visto, com role=status, nunca fixo", () => {
    const h = html({ avisoAparente: true, conquista: CONQUISTA, pct: 91 });
    expect(h).toContain("+10 pts");
    expect(h).toContain("aula assistida");
    expect(h).not.toMatch(POSICIONADO);
    expect(caixaDoAviso(h)).not.toMatch(ESCONDE);
    expect(caixaDoVisto(h)).toMatch(ESCONDE);
    // Os dois ficam na mesma célula: a troca não muda a largura da barra.
    expect(regiao(h)).toContain("col-start-1");
  });

  test("passado o prazo, o aviso sai de vista, o visto volta e a região fica", () => {
    const h = html({ avisoAparente: false, conquista: CONQUISTA, pct: 91 });
    expect(regiao(h)).not.toMatch(ESCONDE);
    expect(caixaDoAviso(h)).toMatch(ESCONDE);
    expect(caixaDoVisto(h)).not.toMatch(ESCONDE);
  });

  test("a entrada e a saída usam translate e opacity, e com movimento reduzido só a opacidade", () => {
    const h = html({ avisoAparente: true, conquista: CONQUISTA, pct: 91 });
    expect(caixaDoAviso(h)).toContain(
      "transition-[translate,opacity,visibility]"
    );
    expect(caixaDoAviso(h)).toContain(
      "motion-reduce:transition-[opacity,visibility]"
    );
  });

  test("o bônus de sequência entra no mesmo aviso", () => {
    const h = html({
      avisoAparente: true,
      conquista: { bonusSequencia: 30, pontos: 10, sequenciaDias: 7 },
      pct: 91,
    });
    expect(h).toContain("Sequência de 7 dias úteis: +30 pts");
  });
});
