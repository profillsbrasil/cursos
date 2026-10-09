import { describe, expect, test } from "bun:test";

import { primeiroNaPagina } from "./editor";

/** Um elemento falso que sabe a própria posição na página, como o DOM sabe. */
interface Campo {
  compareDocumentPosition: (outro: Campo) => number;
  id: string;
}

const ANTES = 2;
const DEPOIS = 4;

function pagina(...ids: string[]): Record<string, Campo> {
  const campos: Record<string, Campo> = {};
  for (const id of ids) {
    campos[id] = {
      compareDocumentPosition: (outro) =>
        ids.indexOf(outro.id) < ids.indexOf(id) ? ANTES : DEPOIS,
      id,
    };
  }
  return campos;
}

describe("primeiroNaPagina", () => {
  const c = pagina(
    "curso-titulo",
    "curso-slug",
    "curso-tema",
    "curso-capaAlt",
    "aula-duracao"
  );

  test("escolhe o campo que vem antes na página, não o primeiro da lista", () => {
    expect(
      primeiroNaPagina([
        c["curso-capaAlt"],
        c["curso-slug"],
        c["curso-tema"],
        c["curso-titulo"],
      ])?.id
    ).toBe("curso-titulo");
  });

  test("uma aula com erro não passa na frente do título", () => {
    expect(primeiroNaPagina([c["aula-duracao"], c["curso-titulo"]])?.id).toBe(
      "curso-titulo"
    );
  });

  test("lista vazia não escolhe nada", () => {
    expect(primeiroNaPagina<Campo>([])).toBeUndefined();
  });
});
