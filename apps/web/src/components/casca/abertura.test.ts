import { describe, expect, test } from "bun:test";

import { caminhoDaAula, caminhoDoCurso } from "@/lib/rotas";

import { aberturaEm, alternar, estaAberta, navegar } from "./abertura";

const AULA_1 = caminhoDaAula("comercial", "a1");
const AULA_2 = caminhoDaAula("comercial", "a2");

function percorrer(
  preferida: boolean,
  passos: readonly (string | { alterna: boolean })[]
) {
  const [primeiro, ...resto] = passos;
  let a = aberturaEm(primeiro as string, preferida);
  const abertaEmCada = [estaAberta(a)];
  for (const passo of resto) {
    if (typeof passo === "string") {
      const seguinte = navegar(a, passo);
      a = seguinte === "mesmo_lugar" ? a : seguinte;
    } else {
      a = alternar(a, passo.alterna);
    }
    abertaEmCada.push(estaAberta(a));
  }
  return { abertaEmCada, abertura: a };
}

describe("a sidebar na aula", () => {
  test("abrir a aula direto recolhe, com o cookie dizendo aberta", () => {
    expect(estaAberta(aberturaEm(AULA_1, true))).toBe(false);
  });

  test("fora da aula, vale o cookie", () => {
    expect(estaAberta(aberturaEm("/meus-cursos", true))).toBe(true);
    expect(estaAberta(aberturaEm(caminhoDoCurso("comercial"), false))).toBe(
      false
    );
  });

  test("entrar na aula recolhe, e sair volta ao que a pessoa tinha deixado", () => {
    expect(
      percorrer(true, ["/meus-cursos", AULA_1, caminhoDoCurso("comercial")])
        .abertaEmCada
    ).toEqual([true, false, true]);
  });

  test("aberta na aula, fica aberta até a próxima aula", () => {
    expect(
      percorrer(true, [AULA_1, { alterna: true }, AULA_1, AULA_2]).abertaEmCada
    ).toEqual([false, true, true, false]);
  });

  test("abrir na aula não muda a preferência: com o cookie recolhido, sair recolhe", () => {
    const { abertura, abertaEmCada } = percorrer(false, [
      AULA_1,
      { alterna: true },
      "/trocar-pontos",
    ]);
    expect(abertaEmCada).toEqual([false, true, false]);
    expect(abertura.preferida).toBe(false);
  });

  test("fora da aula, alternar muda a preferência", () => {
    const { abertura } = percorrer(true, ["/meus-cursos", { alterna: false }]);
    expect(abertura.preferida).toBe(false);
  });

  test("o admin nunca está numa aula", () => {
    expect(
      estaAberta(aberturaEm("/admin/catalogo/cursos/a1/aulas/x", true))
    ).toBe(true);
  });

  test("sem caminho (fora do App Router), vale o cookie", () => {
    expect(estaAberta(aberturaEm(null, false))).toBe(false);
  });
});
