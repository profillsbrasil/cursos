import { describe, expect, test } from "bun:test";
import type { Route } from "next";
import { renderToStaticMarkup } from "react-dom/server";

import { BarraDaLista, contagemDePessoas } from "./barra-da-lista";

const TAG = /<[^>]+>/g;
const ASPAS = /&quot;/g;
const texto = (html: string) =>
  html.replace(TAG, " ").replace(ASPAS, '"').replace(/\s+/g, " ").trim();

const OPCOES = [
  { ativa: false, href: "/admin/pessoas" as Route, n: null, rotulo: "Todos" },
  {
    ativa: true,
    href: "/admin/pessoas?perfil=cliente" as Route,
    n: 2,
    rotulo: "Clientes",
  },
];

const comBusca = renderToStaticMarkup(
  <BarraDaLista
    busca={{
      acao: "/admin/pessoas" as Route,
      campos: { perfil: "cliente" },
      id: "busca-de-pessoas",
      termo: "ana",
    }}
    contagem={contagemDePessoas(2, 2, "ana")}
    opcoes={OPCOES}
    rotuloDasOpcoes="Filtrar por perfil"
  />
);

describe("a barra da lista", () => {
  test("as opções vêm antes da contagem e da busca, numa barra só", () => {
    expect(texto(comBusca)).toBe(
      'Todos Clientes 2 2 pessoas para "ana" Nome ou e-mail'
    );
    expect(comBusca).toContain('aria-current="page"');
  });

  test("a busca não tem botão: o Enter envia", () => {
    expect(comBusca).not.toContain("<button");
    expect(texto(comBusca)).not.toContain("Buscar");
  });

  test("a busca guarda o filtro ligado num campo escondido", () => {
    expect(comBusca).toContain(
      '<input type="hidden" name="perfil" value="cliente"/>'
    );
    expect(comBusca).toContain('value="ana"');
  });

  test("sem busca, a barra tem só as opções e a contagem", () => {
    const html = renderToStaticMarkup(
      <BarraDaLista
        contagem="1 curso, 0 liberados a todos"
        opcoes={OPCOES}
        rotuloDasOpcoes="Liberar por"
      />
    );
    expect(html).not.toContain("<search");
    expect(texto(html)).toBe("Todos Clientes 2 1 curso, 0 liberados a todos");
  });
});

describe("a contagem de pessoas", () => {
  test("diz quantas, para qual termo, e quantas faltam quando corta", () => {
    expect(contagemDePessoas(1, 1, "")).toBe("1 pessoa");
    expect(contagemDePessoas(2, 2, "ana")).toBe('2 pessoas para "ana"');
    expect(contagemDePessoas(50, 120, "")).toBe("50 de 120 pessoas");
    expect(contagemDePessoas(50, 1200, "li")).toBe(
      '50 de 1.200 pessoas para "li"'
    );
  });
});
