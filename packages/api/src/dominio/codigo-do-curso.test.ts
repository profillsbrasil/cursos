import { describe, expect, test } from "bun:test";

import { CURSOS } from "@cursos/db/seed/dados";

import { codigoLivre, siglaDaCategoria } from "./codigo-do-curso";

describe("siglaDaCategoria", () => {
  test.each([
    ["Processo de envase", "PE"],
    ["Vendas e negócios", "VN"],
    ["Operação de linha", "OL"],
    ["Comercial", "COM"],
    ["Ação", "ACA"],
    ["TI", "TI"],
    ["  produção   e   montagem ", "PM"],
    ["Segurança do trabalho em máquinas industriais pesadas", "STMI"],
    ["Para os de com a o as os", "CUR"],
    ["NR-12: segurança", "N1S"],
  ])("%p vira %p", (nome, sigla) => {
    expect(siglaDaCategoria(nome)).toBe(sigla);
  });
});

describe("codigoLivre", () => {
  test("sem código da sigla, começa em 001", () => {
    expect(codigoLivre("PE", new Set())).toBe("PE-001");
  });

  test("pega o menor número livre, inclusive um buraco", () => {
    expect(codigoLivre("PE", new Set(["PE-001", "PE-003"]))).toBe("PE-002");
  });

  test("o código de outra sigla não ocupa o número", () => {
    expect(codigoLivre("PE", new Set(["PEA-001", "POP-COM-001"]))).toBe(
      "PE-001"
    );
  });

  test("passado o 999, o número cresce sem cortar", () => {
    const ocupados = new Set(
      Array.from(
        { length: 999 },
        (_, i) => `PE-${String(i + 1).padStart(3, "0")}`
      )
    );
    expect(codigoLivre("PE", ocupados)).toBe("PE-1000");
  });
});

test("o seed dá a cada curso o código da regra, menos o POP-COM-001, de antes dela", () => {
  const ocupados = new Set(["POP-COM-001"]);
  const esperados = CURSOS.map((c) => {
    if (ocupados.has(c.codigo)) {
      return c.codigo;
    }
    const codigo = codigoLivre(siglaDaCategoria(c.categoria), ocupados);
    ocupados.add(codigo);
    return codigo;
  });
  expect(CURSOS.map((c) => c.codigo)).toEqual(esperados);
});
