import { describe, expect, test } from "bun:test";
import type { Route } from "next";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { renderToStaticMarkup } from "react-dom/server";

import { ProvedorDaCasca } from "@/components/casca/provedor-da-casca";

import { CartaoContinuar } from "./cartao-continuar";
import type { Continuar } from "./continuar";

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
  return renderToStaticMarkup(
    <PathnameContext value={caminho}>
      <ProvedorDaCasca aberta={aberta}>
        <CartaoContinuar cartao={cumprida(CONTINUAR)} />
      </ProvedorDaCasca>
    </PathnameContext>
  );
}

const vezes = (texto: string, trecho: string) => texto.split(trecho).length - 1;

// Antes, o cartão aberto e o botão solto da recolhida eram dois elementos, e o
// leitor de tela achava dois links iguais. Agora o mesmo elemento encolhe.
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
