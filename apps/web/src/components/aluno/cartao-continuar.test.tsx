import { describe, expect, mock, test } from "bun:test";
import type { Route } from "next";
import { renderToStaticMarkup } from "react-dom/server";

import { ProvedorDaCasca } from "@/components/casca/provedor-da-casca";

import type { Continuar } from "./continuar";

// Fora do App Router o usePathname não tem de onde ler; o teste diz o caminho, e o
// resto do módulo fica o de verdade.
let caminhoAtual = "/";
const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  usePathname: () => caminhoAtual,
}));

const { CartaoContinuar } = await import("./cartao-continuar");

const AULA = "/cursos/comercial/aulas/a1" as Route;

const CONTINUAR: Continuar = {
  chamada: "Continuar · faltam 7 min",
  chamadaAqui: "Assistindo agora",
  href: AULA,
  pct: 51,
  rotulo: "Continuar · faltam 7 min: Pilar Urgência · Aula 4, 51% do curso",
  tipo: "continuar",
  titulo: "Pilar Urgência · Aula 4",
};

// O use() lê na hora uma Promise marcada como cumprida, sem suspender.
function cumprida<T>(valor: T): Promise<T> {
  return Object.assign(Promise.resolve(valor), {
    status: "fulfilled",
    value: valor,
  });
}

function html(caminho: string, aberta: boolean) {
  caminhoAtual = caminho;
  return renderToStaticMarkup(
    <ProvedorDaCasca aberta={aberta}>
      <CartaoContinuar cartao={cumprida(CONTINUAR)} />
    </ProvedorDaCasca>
  );
}

const vezes = (texto: string, trecho: string) => texto.split(trecho).length - 1;

// Antes, o cartão da aberta e o redondo da recolhida eram dois elementos no HTML, e
// o CSS escondia um deles em cada modo. O teste conta no markup do servidor, que
// inclui o que o CSS esconde: o link, o rótulo e o aria-current aparecem uma vez,
// porque o mesmo elemento encolhe.
describe("o Continuar é um elemento só", () => {
  for (const aberta of [true, false]) {
    const modo = aberta ? "aberta" : "recolhida";

    test(`${modo}, fora do destino: um link, com rótulo e href uma vez`, () => {
      const h = html("/meus-cursos", aberta);
      expect(vezes(h, "<a ")).toBe(1);
      expect(vezes(h, `aria-label="${CONTINUAR.rotulo}"`)).toBe(1);
      expect(vezes(h, `href="${AULA}"`)).toBe(1);
      expect(vezes(h, "aria-current")).toBe(0);
    });

    test(`${modo}, no destino: aria-current uma vez, sem link`, () => {
      const h = html(AULA, aberta);
      expect(vezes(h, "<a ")).toBe(0);
      expect(vezes(h, 'aria-current="page"')).toBe(1);
      expect(vezes(h, CONTINUAR.chamadaAqui)).toBe(1);
    });
  }
});

const TAG_DO_CONTINUAR = /<(?:a|div)\b[^>]*data-slot="tooltip-trigger"[^>]*>/;
const CLASSE = /\bclass="([^"]*)"/;

const classesDoContinuar = (h: string) => {
  const tag = TAG_DO_CONTINUAR.exec(h)?.[0] ?? "";
  const classes = CLASSE.exec(tag)?.[1];
  if (!classes) {
    throw new Error("sem o Continuar no HTML");
  }
  return classes.split(" ");
};

// O fundo e a cor do Continuar mudam com o modo. Uma transição no próprio elemento
// anima essa troca, e o Ctrl+B não anima (DESIGN.md). Só a camada do hover
// (::before) transiciona, e só a opacidade dela.
describe("a troca de modo não anima o Continuar", () => {
  for (const [caso, caminho] of [
    ["com link", "/meus-cursos"],
    ["no destino", AULA],
  ] as const) {
    test(`${caso}: nenhuma transição fora do ::before`, () => {
      const transicoes = classesDoContinuar(html(caminho, true)).filter((c) =>
        c.includes("transition")
      );
      expect(
        transicoes.filter(
          (c) => !(c.startsWith("before:") || c.includes(":before:"))
        )
      ).toEqual([]);
      if (caso === "com link") {
        expect(transicoes).toContain("before:transition-opacity");
      }
    });
  }
});
