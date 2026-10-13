import { describe, expect, test } from "bun:test";

import { ITENS_DO_ADMIN } from "../admin/menu";
import { ITENS_DO_ALUNO } from "../aluno/menu";
import { indiceAtivo, type MovimentoDaPilula, movimentoDaPilula } from "./nav";

describe("indiceAtivo", () => {
  test("caminho exato marca page", () => {
    expect(indiceAtivo("/meus-cursos", ITENS_DO_ALUNO)).toEqual({
      ariaCurrent: "page",
      indice: 1,
    });
  });

  test("rota filha por outrosPrefixos marca true", () => {
    expect(indiceAtivo("/cursos/comercial/aulas/x", ITENS_DO_ALUNO)).toEqual({
      ariaCurrent: "true",
      indice: 1,
    });
  });

  test("rota filha do próprio href marca true", () => {
    expect(indiceAtivo("/admin/catalogo/cursos/novo", ITENS_DO_ADMIN)).toEqual({
      ariaCurrent: "true",
      indice: 1,
    });
  });

  test("prefixo sem barra não casa", () => {
    expect(indiceAtivo("/meus-cursos-antigos", ITENS_DO_ALUNO)).toBeNull();
  });

  test("item em breve nunca é ativo", () => {
    expect(indiceAtivo("/", ITENS_DO_ALUNO)).toBeNull();
  });
});

const CURVA: MovimentoDaPilula["transicao"]["ease"] = [0.23, 1, 0.32, 1];

describe("movimentoDaPilula", () => {
  test("de um item a outro, desliza 180 ms até o passo do novo índice", () => {
    expect(movimentoDaPilula(2, false)).toEqual({
      transform: "translateY(88px)",
      transicao: { duration: 0.18, ease: CURVA },
    });
  });

  test("com movimento reduzido, salta", () => {
    expect(movimentoDaPilula(0, true)).toEqual({
      transform: "translateY(0px)",
      transicao: { duration: 0, ease: CURVA },
    });
  });

  test("sem item ativo, sem pílula", () => {
    expect(movimentoDaPilula(null, false)).toBeNull();
  });
});
