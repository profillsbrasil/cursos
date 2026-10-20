import { describe, expect, test } from "bun:test";
import type { Retomada } from "@cursos/api/dominio/painel";
import type { AulaId, Capa } from "@cursos/api/dominio/tipos";

import { hrefDaRetomada } from "@/lib/rotas";

import { acaoDaRetomada, continuarDe, estaAqui } from "./continuar";

const capa = {
  alt: "",
  altura: 720,
  largura: 1280,
  url: "https://x/c.png",
} as Capa;
const curso = { capa, slug: "comercial", titulo: "Comercial" };
const modulo = { numero: 4, titulo: "Pilar Urgência" };
const aula = {
  duracaoSeg: 900,
  id: "11111111-1111-4111-8111-111111111111" as AulaId,
  numeroNoModulo: 4,
  titulo: "Gatilhos",
};
const NA_AULA = "/cursos/comercial/aulas/11111111-1111-4111-8111-111111111111";

const continuar = (faltaSeg: number): Retomada => ({
  aula: { ...aula, faltaSeg, posicaoSeg: aula.duracaoSeg - faltaSeg },
  curso,
  modulo,
  progresso: { feitas: 9, pct: 45, total: 20 },
  proximoNivel: null,
  tipo: "continuar",
});
const comecar: Retomada = { aula, curso, modulo, tipo: "comecar" };
const questionario = (ultima: { acertos: number; total: number } | null) =>
  ({
    aula,
    curso,
    modulo,
    questionarios: { feitas: 17, pct: 85, total: 20 },
    tipo: "questionario",
    ultima,
  }) satisfies Retomada;
const NO_QUESTIONARIO = `${NA_AULA}#questionario`;

describe("continuarDe", () => {
  test("continuar: o título da aula, minutos que faltam, barra e link da aula", () => {
    expect<unknown>(continuarDe(continuar(420))).toEqual({
      chamada: "Continuar · faltam 7 min",
      chamadaAqui: "Assistindo agora",
      curso: "Comercial",
      href: NA_AULA,
      pct: 45,
      rotulo: "Continuar · faltam 7 min: Gatilhos, Comercial, 45% do curso",
      tipo: "continuar",
      titulo: "Gatilhos",
    });
  });

  test("continuar com menos de um minuto diz 'falta 1 min'", () => {
    expect(continuarDe(continuar(20))?.chamada).toBe("Continuar · falta 1 min");
  });

  test("comecar: sem barra, e o rótulo sem porcentagem", () => {
    expect<unknown>(continuarDe(comecar)).toEqual({
      chamada: "Começar curso",
      chamadaAqui: "Assistindo agora",
      curso: "Comercial",
      href: NA_AULA,
      pct: null,
      rotulo: "Começar curso: Gatilhos, Comercial",
      tipo: "comecar",
      titulo: "Gatilhos",
    });
  });

  test("questionário: quantos faltam, a aula e o link para o questionário dela", () => {
    expect<unknown>(continuarDe(questionario(null))).toEqual({
      chamada: "Faltam 3 questionários",
      chamadaAqui: "Você está no questionário",
      curso: "Comercial",
      href: NO_QUESTIONARIO,
      pct: 85,
      rotulo:
        "Faltam 3 questionários: Questionário · Gatilhos, Comercial, 85% do curso",
      tipo: "questionario",
      titulo: "Questionário · Gatilhos",
    });
  });

  test("sem retomada, sem cartão", () => {
    expect(continuarDe(null)).toBeNull();
  });

  test("o cartão e o banner levam ao mesmo lugar nos três tipos", () => {
    for (const r of [continuar(420), comecar, questionario(null)]) {
      expect(continuarDe(r)?.href).toBe(hrefDaRetomada(r));
    }
  });
});

describe("acaoDaRetomada", () => {
  test("um verbo por tipo de retomada, e quem nunca abriu aula começa o curso", () => {
    expect<unknown>(acaoDaRetomada(comecar)).toEqual({
      href: NA_AULA,
      icone: "play",
      texto: "Começar curso",
    });
    expect(acaoDaRetomada(continuar(420)).texto).toBe("Continuar aula");
    expect<unknown>(acaoDaRetomada(questionario(null))).toEqual({
      href: NO_QUESTIONARIO,
      icone: "questionario",
      texto: "Fazer o questionário",
    });
    expect(acaoDaRetomada(questionario({ acertos: 1, total: 3 })).texto).toBe(
      "Tentar de novo"
    );
  });

  test("sem retomada, leva a Meus cursos sem prometer aula", () => {
    expect(acaoDaRetomada(null)).toEqual({
      href: "/meus-cursos",
      icone: null,
      texto: "Ver Meus cursos",
    });
  });
});

describe("hrefDaRetomada", () => {
  test("a aula nos tipos com aula, e o questionário dela quando só ele falta", () => {
    expect<string>(hrefDaRetomada(comecar)).toBe(NA_AULA);
    expect<string>(hrefDaRetomada(questionario(null))).toBe(NO_QUESTIONARIO);
  });
});

describe("estaAqui", () => {
  test("no destino do cartão, e só nele", () => {
    const c = continuarDe(continuar(420));
    if (!c) {
      throw new Error("cartão esperado");
    }
    expect(estaAqui(c, NA_AULA)).toBe(true);
    expect(estaAqui(c, "/meus-cursos")).toBe(false);
  });
});
