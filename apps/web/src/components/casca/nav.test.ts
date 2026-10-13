import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ITENS_DO_ADMIN } from "../admin/menu";
import { ITENS_DO_ALUNO } from "../aluno/menu";
import {
  COOKIE_DA_SIDEBAR,
  indiceAtivo,
  LARGURAS_DA_SIDEBAR,
  type MovimentoDaPilula,
  movimentoDaPilula,
} from "./nav";

const SIDEBAR_DO_UI = join(
  import.meta.dir,
  "../../../../../packages/ui/src/components/sidebar.tsx"
);
const NOME_DO_COOKIE = /const SIDEBAR_COOKIE_NAME = "([^"]+)"/;

describe("cookie da sidebar", () => {
  // O shadcn add pode regenerar o sidebar.tsx com outro nome: a casca passaria a
  // abrir sempre e esqueceria o modo recolhido, sem erro nenhum.
  test("a casca lê o cookie que o SidebarProvider do packages/ui grava", () => {
    const gravado = readFileSync(SIDEBAR_DO_UI, "utf8").match(NOME_DO_COOKIE);
    expect(gravado?.[1]).toBe(COOKIE_DA_SIDEBAR);
  });
});

describe("largura recolhida", () => {
  // O sidebar-container tem border-r dentro da largura (border-box): sem somar o
  // 1 px, o recuo da direita cai para 13 px e o quadrado de 40 px não cabe.
  test("14 px de recuo, 40 px de conteúdo, 14 px de recuo e 1 px de borda", () => {
    expect(LARGURAS_DA_SIDEBAR["--sidebar-width-icon"]).toBe("69px");
  });
});

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
