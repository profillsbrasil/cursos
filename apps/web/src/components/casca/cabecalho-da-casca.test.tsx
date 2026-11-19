import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { CabecalhoDaCasca } from "./cabecalho-da-casca";
import { ProvedorDaCasca } from "./provedor-da-casca";

const BOTAO = /<button[^>]*>/g;
const ATRIBUTO = /\s(aria-[a-z]+)="([^"]*)"/g;

function botoes(aberta: boolean) {
  const html = renderToStaticMarkup(
    <ProvedorDaCasca aberta={aberta}>
      <CabecalhoDaCasca />
    </ProvedorDaCasca>
  );

  return [...html.matchAll(BOTAO)].map(([tag]) =>
    Object.fromEntries(
      [...tag.matchAll(ATRIBUTO)].map(([, nome, valor]) => [nome, valor])
    )
  );
}

describe("o cabeçalho tem um botão só para alternar a navegação, e o foco não cai no body", () => {
  test("aberta: Recolher, expandido", () => {
    expect(botoes(true)).toEqual([
      { "aria-expanded": "true", "aria-label": "Recolher navegação" },
    ]);
  });

  test("recolhida: Abrir, não expandido", () => {
    expect(botoes(false)).toEqual([
      { "aria-expanded": "false", "aria-label": "Abrir navegação" },
    ]);
  });
});
