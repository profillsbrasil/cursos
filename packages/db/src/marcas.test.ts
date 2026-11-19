import { describe, expect, test } from "bun:test";

import {
  aulaId,
  cursoId,
  diaISO,
  ehAlternativaId,
  ehAulaId,
  ehCategoriaId,
  ehComunicadoId,
  ehConviteId,
  ehCursoId,
  ehDiaISO,
  ehEmail,
  ehLiberacaoDoPerfilId,
  ehLiberacaoId,
  ehMaterialId,
  ehModuloId,
  ehPerguntaId,
  ehTentativaId,
  ehVersao,
  ehVideoId,
  email,
  MarcaRecusada,
  marcar,
  novaTentativaId,
  novoAlternativaId,
  novoAulaId,
  novoCategoriaId,
  novoMaterialId,
  novoModuloId,
  novoPerguntaId,
} from "./marcas";

const PREDICADOS_DE_ID = {
  ehAlternativaId,
  ehAulaId,
  ehCategoriaId,
  ehComunicadoId,
  ehConviteId,
  ehCursoId,
  ehLiberacaoDoPerfilId,
  ehLiberacaoId,
  ehMaterialId,
  ehModuloId,
  ehPerguntaId,
  ehTentativaId,
  ehVersao,
  ehVideoId,
};

const NOVOS_IDS = {
  novaTentativaId,
  novoAlternativaId,
  novoAulaId,
  novoCategoriaId,
  novoMaterialId,
  novoModuloId,
  novoPerguntaId,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("predicado de id", () => {
  for (const [nome, eh] of Object.entries(PREDICADOS_DE_ID)) {
    test(`${nome} aceita UUID e os ids curtos dos testes, e recusa vazio e espaço`, () => {
      for (const valor of [
        "0d3c2b1a-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
        "0D3C2B1A-4E5F-4A6B-8C7D-9E0F1A2B3C4D",
        "c1",
        "user_admin",
        "aqz-KE-bpKQ",
      ]) {
        expect(eh(valor)).toBe(true);
      }

      for (const valor of ["", " ", "c 1", " c1", "c1\n"]) {
        expect(eh(valor)).toBe(false);
      }
    });
  }
});

describe("ehDiaISO", () => {
  test("aceita o dia que existe no calendário", () => {
    for (const valor of [
      "2026-10-15",
      "2024-02-29",
      "2026-12-31",
      "2026-01-01",
    ]) {
      expect(ehDiaISO(valor)).toBe(true);
    }
  });

  test("recusa o dia fora do formato ou fora do calendário", () => {
    for (const valor of [
      "2026-13",
      "2026-13-01",
      "2026-02-30",
      "2025-02-29",
      "2026-1-05",
      "15/10/2026",
      "2026-10-15T00:00:00Z",
      " 2026-10-15",
      "",
    ]) {
      expect(ehDiaISO(valor)).toBe(false);
    }
  });
});

describe("ehEmail", () => {
  test("aceita o e-mail aparado, em ASCII e em minúsculas", () => {
    for (const valor of [
      "ana@x.com",
      "ana.ribeiro@exemplo.com.br",
      "a_b+tag@sub-dominio.x.com",
      `${"a".repeat(242)}@exemplo.com`,
    ]) {
      expect(ehEmail(valor)).toBe(true);
    }
  });

  test("recusa maiúscula, espaço, domínio sem ponto, fora do ASCII e acima de 254 caracteres", () => {
    for (const valor of [
      "Ana@Exemplo.com",
      " ana@x.com",
      "ana@x",
      "ana@x.com.",
      "ana",
      "joão@x.com",
      `${"a".repeat(243)}@exemplo.com`,
    ]) {
      expect(ehEmail(valor)).toBe(false);
    }
  });
});

describe("construtor", () => {
  test("devolve o mesmo valor quando o predicado aceita", () => {
    expect<string>(cursoId("c1")).toBe("c1");
    expect<string>(aulaId("a1")).toBe("a1");
    expect<string>(diaISO("2026-10-15")).toBe("2026-10-15");
    expect<string>(email("ana@x.com")).toBe("ana@x.com");
    expect<string>(marcar(ehCursoId, "c2")).toBe("c2");
  });

  test("lança MarcaRecusada com o valor quando o predicado recusa", () => {
    expect(() => diaISO("2026-13")).toThrow(MarcaRecusada);
    expect(() => email("Ana@Exemplo.com")).toThrow(MarcaRecusada);
    expect(() => cursoId("")).toThrow('Fora do formato da marca: ""');
  });
});

describe("novoXId", () => {
  for (const [nome, novo] of Object.entries(NOVOS_IDS)) {
    test(`${nome} cria um UUID novo a cada chamada`, () => {
      const [a, b] = [novo(), novo()];

      expect(a).toMatch(UUID);
      expect(b).toMatch(UUID);
      expect(a).not.toBe(b);
    });
  }
});
