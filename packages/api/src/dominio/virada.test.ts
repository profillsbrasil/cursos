import { describe, expect, test } from "bun:test";

import type { CursoDaBusca, LiberacaoDaBusca } from "./acompanhamento";
import type { LinhasHistorico } from "./historico";
import { aulaId, cursoId } from "./marcas";
import { BONUS_DE_FUNCIONARIO } from "./regras";
import {
  type PessoaNaVirada,
  planejarVirada,
  recusaDaGravacao,
  totaisDaVirada,
} from "./virada";

const AGORA = new Date("2026-10-27T12:00:00Z");

const cursoDaBusca = (id: string, mudar: Partial<CursoDaBusca> = {}) => ({
  id: cursoId(id),
  modulos: [
    {
      aulas: [
        { id: aulaId(`${id}-a1`), perguntas: 0 },
        { id: aulaId(`${id}-a2`), perguntas: 0 },
      ],
      numero: 1,
      titulo: "Módulo",
    },
  ],
  status: "publicado" as const,
  titulo: `Curso ${id}`,
  ...mudar,
});

const doPerfil = (curso: string): LiberacaoDaBusca => ({
  cursoId: cursoId(curso),
  liberadaEm: AGORA,
  origem: "perfil",
  revogadaEm: null,
});

const SEM_ESTUDO: LinhasHistorico = {
  assistidas: [],
  certificados: [],
  posicoes: [],
  questionarios: [],
};

const assistiu = (...aulas: string[]): LinhasHistorico => ({
  ...SEM_ESTUDO,
  assistidas: aulas.map((aula) => ({
    assistidaEm: AGORA,
    aulaId: aulaId(aula),
  })),
});

function pessoa(mudar: Partial<PessoaNaVirada> = {}): PessoaNaVirada {
  return {
    cursos: [cursoDaBusca("c1")],
    liberacoes: [doPerfil("c1")],
    perfil: "funcionario",
    precos: new Map([["c1", 800]]),
    saldo: 0,
    temBonus: false,
    userId: "user_a",
    ...SEM_ESTUDO,
    ...mudar,
  };
}

describe("planejarVirada", () => {
  test("Funcionário sem bônus ganha o bônus e troca o curso que estudou", () => {
    expect(planejarVirada(pessoa(assistiu("c1-a1")))).toEqual({
      bonus: BONUS_DE_FUNCIONARIO,
      pulados: [],
      trocas: [{ cursoId: cursoId("c1"), preco: 800, titulo: "Curso c1" }],
      userId: "user_a",
    });
  });

  test("a posição acima de 0 s conta como estudo; a de 0 s, não", () => {
    const posicao = (posicaoSeg: number) =>
      pessoa({
        posicoes: [
          { atualizadaEm: AGORA, aulaId: aulaId("c1-a2"), posicaoSeg },
        ],
      });

    expect(planejarVirada(posicao(30)).trocas).toHaveLength(1);
    expect(planejarVirada(posicao(0)).trocas).toEqual([]);
  });

  test("o curso que nunca abriu não troca nem aparece nos pulados", () => {
    expect(planejarVirada(pessoa())).toEqual({
      bonus: BONUS_DE_FUNCIONARIO,
      pulados: [],
      trocas: [],
      userId: "user_a",
    });
  });

  test("quem já tem o bônus não ganha outro", () => {
    const p = pessoa({ ...assistiu("c1-a1"), saldo: 900, temBonus: true });
    expect(planejarVirada(p).bonus).toBe(0);
    expect(planejarVirada(p).trocas).toHaveLength(1);
  });

  test("o curso com liberação própria ativa fica de fora", () => {
    const p = pessoa({
      ...assistiu("c1-a1"),
      liberacoes: [doPerfil("c1"), { ...doPerfil("c1"), origem: "troca" }],
    });

    expect(planejarVirada(p).trocas).toEqual([]);
    expect(planejarVirada(p).pulados).toEqual([]);
  });

  test("a liberação própria revogada não conta: o curso troca", () => {
    const p = pessoa({
      ...assistiu("c1-a1"),
      liberacoes: [
        doPerfil("c1"),
        { ...doPerfil("c1"), origem: "admin", revogadaEm: AGORA },
      ],
    });

    expect(planejarVirada(p).trocas).toHaveLength(1);
  });

  test("o curso sem preço pula com o motivo", () => {
    const p = pessoa({ ...assistiu("c1-a1"), precos: new Map([["c1", null]]) });
    expect(planejarVirada(p)).toMatchObject({
      pulados: [
        { cursoId: "c1", motivo: { tipo: "sem_preco" }, titulo: "Curso c1" },
      ],
      trocas: [],
    });
  });

  test("o curso em produção pula com o motivo", () => {
    const p = pessoa({
      ...assistiu("c1-a1"),
      cursos: [cursoDaBusca("c1", { status: "em_producao" })],
    });

    expect(planejarVirada(p).pulados).toEqual([
      {
        cursoId: cursoId("c1"),
        motivo: { tipo: "em_producao" },
        titulo: "Curso c1",
      },
    ]);
  });

  test("o saldo com o bônus paga do mais barato ao mais caro, e o que não cabe pula", () => {
    const p = pessoa({
      ...assistiu("c1-a1", "c2-a1", "c3-a1"),
      cursos: ["c1", "c2", "c3"].map((id) => cursoDaBusca(id)),
      liberacoes: ["c1", "c2", "c3"].map(doPerfil),
      precos: new Map([
        ["c1", 3000],
        ["c2", 1000],
        ["c3", 2500],
      ]),
      saldo: 100,
    });

    const plano = planejarVirada(p);
    expect(plano.trocas.map((t) => t.cursoId)).toEqual([
      cursoId("c2"),
      cursoId("c3"),
    ]);
    expect(plano.pulados).toEqual([
      {
        cursoId: cursoId("c1"),
        motivo: { faltam: 1400, tipo: "saldo_curto" },
        titulo: "Curso c1",
      },
    ]);
  });

  test("Cliente e Público aberto não mudam nada", () => {
    for (const perfil of ["cliente", "publico"] as const) {
      expect(planejarVirada(pessoa({ ...assistiu("c1-a1"), perfil }))).toEqual({
        bonus: 0,
        pulados: [],
        trocas: [],
        userId: "user_a",
      });
    }
  });
});

describe("totaisDaVirada", () => {
  test("soma o que entra pelo bônus e o que sai pelas trocas", () => {
    const um = planejarVirada(pessoa(assistiu("c1-a1")));
    const outro = planejarVirada(pessoa({ temBonus: true, userId: "user_b" }));
    expect(totaisDaVirada([um, outro])).toEqual({
      bonus: 1,
      entram: BONUS_DE_FUNCIONARIO,
      nadaAFazer: 1,
      pulados: 0,
      saem: 800,
      trocas: 1,
    });
  });
});

describe("recusaDaGravacao", () => {
  test("recusa o banco sem nenhuma linha de perfil", () => {
    expect(recusaDaGravacao(0)).toContain("DATABASE_URL");
    expect(recusaDaGravacao(3)).toBeNull();
  });
});
