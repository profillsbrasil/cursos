import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { grafo, modulosDoCliente, SRC } from "./grafo-do-cliente";

const RAIZ = join(SRC, "../../..");

const METODO =
  "(?:drop|every|filter|find|flatMap|forEach|map|reduce|some|take|toArray)";

const ITERATOR_HELPER = new RegExp(
  [
    String.raw`\.(?:values|keys|entries)\(\)\s*\.${METODO}\(`,
    String.raw`\.matchAll\((?:[^()]|\([^()]*\))*\)\s*\.${METODO}\(`,
    String.raw`\bIterator\.from\(`,
    String.raw`\.toArray\(\)`,
  ].join("|"),
  "g"
);

/**
 * O Next 16 compila o cliente para chrome 111, edge 111, firefox 111 e
 * safari 16.4, sem transpilar nem trazer polyfill de iterator helpers, que só
 * existem a partir do Chrome 122, do Firefox 131 e do Safari 18.4. Nesses
 * navegadores, `lista.values().map` lança TypeError. No cliente, use
 * `flatMap` ou um laço que empurra num array.
 */
describe("o cliente roda sem iterator helpers", () => {
  const doCliente = new Set<string>();

  for (const modulo of modulosDoCliente()) {
    grafo(modulo, doCliente);
  }

  test("o grafo do cliente chega ao domínio do @cursos/api", () => {
    expect(
      doCliente.has(join(RAIZ, "packages/api/src/dominio/trechos.ts"))
    ).toBe(true);
  });

  test("nenhum módulo que um use client alcança chama iterator helper", () => {
    const achados = [...doCliente].flatMap((arquivo) => {
      const texto = readFileSync(arquivo, "utf8");

      return [...texto.matchAll(ITERATOR_HELPER)].map(
        (achado) =>
          `${relative(RAIZ, arquivo)}:${texto.slice(0, achado.index).split("\n").length} ${achado[0].replaceAll(/\s+/g, "")}`
      );
    });

    expect(achados).toEqual([]);
  });
});
