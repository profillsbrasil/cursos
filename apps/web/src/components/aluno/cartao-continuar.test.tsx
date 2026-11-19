import { describe, expect, mock, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { ProvedorDaCasca } from "@/components/casca/provedor-da-casca";
import { rota } from "@/lib/rotas";

import type { Continuar } from "./continuar";

let caminhoAtual = "/";
const navegacao = await import("next/navigation");

mock.module("next/navigation", () => ({
  ...navegacao,
  usePathname: () => caminhoAtual,
}));

const { CartaoContinuar } = await import("./cartao-continuar");

const AULA = rota("/cursos/comercial/aulas/a1");
const DESTINO_FORA_DA_AULA = rota("/cursos/comercial");

const CONTINUAR: Continuar = {
  chamada: "Continuar · faltam 7 min",
  chamadaAqui: "Assistindo agora",
  curso: "Comercial",
  href: AULA,
  pct: 51,
  rotulo: "Continuar · faltam 7 min: Gatilhos, Comercial, 51% do curso",
  tipo: "continuar",
  titulo: "Gatilhos",
};

const QUESTIONARIO_FORA_DA_AULA: Continuar = {
  chamada: "Faltam 2 questionários",
  chamadaAqui: "Você está no questionário",
  curso: "Comercial",
  href: DESTINO_FORA_DA_AULA,
  pct: 100,
  rotulo:
    "Faltam 2 questionários: Questionário · Gatilhos, Comercial, 100% do curso",
  tipo: "questionario",
  titulo: "Questionário · Gatilhos",
};

function promessaCumpridaSemSuspender<T>(valor: T): Promise<T> {
  return Object.assign(Promise.resolve(valor), {
    status: "fulfilled",
    value: valor,
  });
}

function html(caminho: string, aberta: boolean, cartao = CONTINUAR) {
  caminhoAtual = caminho;

  return renderToStaticMarkup(
    <ProvedorDaCasca aberta={aberta}>
      <CartaoContinuar cartao={promessaCumpridaSemSuspender(cartao)} />
    </ProvedorDaCasca>
  );
}

const vezes = (texto: string, trecho: string) => texto.split(trecho).length - 1;

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
      const h = html(DESTINO_FORA_DA_AULA, aberta, QUESTIONARIO_FORA_DA_AULA);
      expect(vezes(h, "<a ")).toBe(0);
      expect(vezes(h, 'aria-current="page"')).toBe(1);
      expect(vezes(h, QUESTIONARIO_FORA_DA_AULA.chamadaAqui)).toBe(1);
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

describe("a troca de modo não anima o Continuar", () => {
  for (const [caso, caminho] of [
    ["com link", "/meus-cursos"],
    ["no destino", DESTINO_FORA_DA_AULA],
  ] as const) {
    test(`${caso}: nenhuma transição fora do ::before`, () => {
      const transicoes = classesDoContinuar(
        html(
          caminho,
          true,
          caso === "no destino" ? QUESTIONARIO_FORA_DA_AULA : CONTINUAR
        )
      ).filter((c) => c.includes("transition"));

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
