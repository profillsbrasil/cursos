import { describe, expect, test } from "bun:test";

import { diaISO } from "@cursos/api/dominio/marcas";
import type { ItemDoExtrato } from "@cursos/api/dominio/pontos";
import { renderToStaticMarkup } from "react-dom/server";

import { Extrato } from "./extrato";

const SPAN = /<li[^>]*><span class="([^"]*)">([^<]*)<\/span>/g;

describe("o extrato de Trocar pontos", () => {
  test("a data curta do ano corrente não quebra linha na coluna de 64 px", () => {
    const itens: ItemDoExtrato[] = [
      {
        dia: diaISO("2026-03-20"),
        id: "l-1",
        pontos: 10,
        texto: "Aula assistida",
      },
    ];

    const html = renderToStaticMarkup(
      <Extrato hoje="2026-10-14" itens={itens} lancamentoNovoId={null} />
    );

    const [data] = [...html.matchAll(SPAN)];
    expect(data?.[2]).toBe("20 de mar.");
    expect(data?.[1].split(" ")).toContain("whitespace-nowrap");
  });
});
