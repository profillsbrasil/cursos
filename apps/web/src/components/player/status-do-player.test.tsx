import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { StatusDoPlayer } from "./status-do-player";

const POSICIONADO = /\b(fixed|absolute|sticky)\b/;
const CONQUISTA = { bonusSequencia: null, pontos: 10, sequenciaDias: 1 };
const ESCONDE = /(^|[\s:])(hidden|invisible|sr-only)(\s|$)/;
const ATALHOS = <p data-atalhos="">atalhos</p>;

const html = (props: Omit<Parameters<typeof StatusDoPlayer>[0], "atalhos">) =>
  renderToStaticMarkup(<StatusDoPlayer atalhos={ATALHOS} {...props} />);

const classesDe = (h: string, antes: string) =>
  h.match(new RegExp(`<div class="([^"]*)"[^>]*>${antes}`))?.[1] ?? "";

const caixaDosAtalhos = (h: string) => classesDe(h, "<p data-atalhos");
const caixaDoAviso = (h: string) => classesDe(h, '<span class="grid size-6');
const REGIAO = /<div class="([^"]*)" role="status">/;
const regiao = (h: string) => h.match(REGIAO)?.[1];

describe("linha de status do player", () => {
  test("vazia, a região de status existe e não sai da árvore de acessibilidade", () => {
    const h = html({
      avisoAparente: false,
      conquista: null,
      envio: { tipo: "em_dia" },
    });
    expect(regiao(h)).toBeDefined();
    expect(regiao(h)).not.toMatch(ESCONDE);
    expect(caixaDosAtalhos(h)).not.toMatch(ESCONDE);
  });

  test("o aviso aparece no lugar dos atalhos, com role=status, nunca fixo", () => {
    const h = html({
      avisoAparente: true,
      conquista: CONQUISTA,
      envio: { tipo: "em_dia" },
    });
    expect(h).toContain("Aula assistida.");
    expect(h).toContain("Você viu 90% dos trechos desta aula.");
    expect(h).toContain("+10 pts");
    expect(h).not.toMatch(POSICIONADO);
    expect(caixaDoAviso(h)).not.toMatch(ESCONDE);
    expect(caixaDosAtalhos(h)).toMatch(ESCONDE);
  });

  test("passado o prazo, o aviso sai de vista, os atalhos voltam e a região fica", () => {
    const h = html({
      avisoAparente: false,
      conquista: CONQUISTA,
      envio: { tipo: "em_dia" },
    });
    expect(regiao(h)).not.toMatch(ESCONDE);
    expect(caixaDoAviso(h)).toMatch(ESCONDE);
    expect(caixaDosAtalhos(h)).not.toMatch(ESCONDE);
  });

  test("a entrada e a saída usam transform e opacity, sem animação com movimento reduzido", () => {
    const h = html({
      avisoAparente: true,
      conquista: CONQUISTA,
      envio: { tipo: "em_dia" },
    });
    expect(caixaDoAviso(h)).toContain(
      "transition-[translate,opacity,visibility]"
    );
    expect(caixaDoAviso(h)).toContain("motion-reduce:transition-none");
  });

  test("o bônus de sequência entra no mesmo aviso", () => {
    const h = html({
      avisoAparente: true,
      conquista: { bonusSequencia: 30, pontos: 10, sequenciaDias: 7 },
      envio: { tipo: "em_dia" },
    });
    expect(h).toContain("Sequência de 7 dias úteis: +30 pts.");
  });

  test("a falha de envio ocupa a área dos atalhos enquanto durar", () => {
    for (const envio of [
      { falhasSeguidas: 2, tipo: "esperando_nova_tentativa" },
      { falhasSeguidas: 1, tipo: "enviando" },
    ] as const) {
      const h = html({ avisoAparente: false, conquista: CONQUISTA, envio });
      expect(h).toContain("Progresso não salvo. Tentando de novo.");
      expect(caixaDosAtalhos(h)).toMatch(ESCONDE);
    }
  });

  test("primeiro envio, pendente e em dia não mostram nada", () => {
    for (const envio of [
      { falhasSeguidas: 0, tipo: "enviando" },
      { tipo: "pendente" },
      { tipo: "em_dia" },
    ] as const) {
      const h = html({ avisoAparente: false, conquista: null, envio });
      expect(h).not.toContain("Progresso");
      expect(h).not.toContain("Aula assistida");
    }
  });
});
