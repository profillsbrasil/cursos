import { describe, expect, test } from "bun:test";

import { cursoCat, idAula, trilhaCat } from "./exemplo";
import type { LinhasHistorico } from "./historico";
import {
  type AlvoComTitulo,
  acaoNaLiberacao,
  type ConteudoDoAlvo,
  decidirLiberar,
  type LinhaDaLiberacao,
  type LinhasDoAcesso,
  montarAcesso,
} from "./liberacao";
import type { CursoId, DiaISO, LiberacaoId, Pessoa, TrilhaId } from "./tipos";

const T1 = "trilha-1" as TrilhaId;
const C1 = "curso-1" as CursoId;
const C2 = "curso-2" as CursoId;
const SOLTO = "curso-solto" as CursoId;
const HOJE = "2026-10-14" as DiaISO;
const SEM_HISTORICO: LinhasHistorico = {
  assistidas: [],
  certificados: [],
  posicoes: [],
};

/** Curso de uma aula e trilha vazia: o conteúdo mínimo do alvo. */
const conteudoDe = (alvo: AlvoComTitulo): ConteudoDoAlvo =>
  alvo.tipo === "curso"
    ? {
        curso: { ...cursoCat(alvo.id, { aulas: [1] }), titulo: alvo.titulo },
        tipo: "curso",
      }
    : {
        tipo: "trilha",
        trilha: { ...trilhaCat(alvo.id, []), titulo: alvo.titulo },
      };

/** Serve a decidirLiberar (pelo alvo) e a montarAcesso (pelo conteúdo). */
type Linha = LinhaDaLiberacao & { alvo: AlvoComTitulo };

function linha(parcial: Partial<Linha> & Pick<Linha, "alvo">): Linha {
  return {
    conteudo: conteudoDe(parcial.alvo),
    id: `lib-${parcial.alvo.id}` as LiberacaoId,
    liberadaEm: new Date("2026-10-01T12:00:00Z"),
    origem: "admin",
    revogadaEm: null,
    ...parcial,
  };
}

const trilha = { id: T1, tipo: "trilha", titulo: "Gestão" } as const;
const curso = (id: CursoId, titulo: string = id) =>
  ({ id, tipo: "curso", titulo }) as const;

describe("acaoNaLiberacao", () => {
  test("liberação de admin ativa se revoga", () => {
    expect(acaoNaLiberacao(linha({ alvo: trilha }))).toEqual({
      tipo: "revogar",
    });
  });

  test("liberação de troca ativa fica fixa", () => {
    expect(
      acaoNaLiberacao(linha({ alvo: curso(C1), origem: "troca" }))
    ).toEqual({ tipo: "fixa_por_troca" });
  });

  test("liberação revogada diz quando, qualquer que seja a origem", () => {
    const em = new Date("2026-10-05T09:30:00Z");
    expect(acaoNaLiberacao(linha({ alvo: trilha, revogadaEm: em }))).toEqual({
      em,
      tipo: "revogada",
    });
  });
});

describe("decidirLiberar", () => {
  const pedirTrilha = (trocadosVistos: CursoId[] = []) =>
    ({ id: T1, tipo: "trilha", trocadosVistos }) as const;

  test("sem liberação ativa do alvo, insere", () => {
    const outras = [linha({ alvo: curso(C1) })];
    expect(decidirLiberar(outras, pedirTrilha(), [C1])).toEqual({
      tipo: "inserir",
    });
  });

  test("liberar de novo devolve a liberação ativa, sem inserir", () => {
    const ativa = linha({ alvo: trilha });
    expect(decidirLiberar([ativa], pedirTrilha(), [])).toEqual({
      liberacaoId: ativa.id,
      tipo: "ja_liberada",
    });
  });

  test("curso que o aluno trocou já está liberado", () => {
    const troca = linha({ alvo: curso(C1), origem: "troca" });
    expect(decidirLiberar([troca], { id: C1, tipo: "curso" }, [])).toEqual({
      liberacaoId: troca.id,
      tipo: "ja_liberada",
    });
  });

  test("trilha e curso com o mesmo id não se confundem", () => {
    const mesmo = "mesmo-id";
    const ativa = linha({
      alvo: { id: mesmo as TrilhaId, tipo: "trilha", titulo: "x" },
    });
    expect(
      decidirLiberar([ativa], { id: mesmo as CursoId, tipo: "curso" }, [])
    ).toEqual({ tipo: "inserir" });
  });

  describe("trilha: os cursos trocados que a tela mostrou", () => {
    const trocouC1 = [linha({ alvo: curso(C1), origem: "troca" })];

    test("a pessoa trocou um curso da trilha depois que a tela abriu: recusa", () => {
      expect(decidirLiberar(trocouC1, pedirTrilha([]), [C1, C2])).toEqual({
        tipo: "trocados_mudaram",
      });
    });

    test("a tela mostrou a troca: insere", () => {
      expect(decidirLiberar(trocouC1, pedirTrilha([C1]), [C1, C2])).toEqual({
        tipo: "inserir",
      });
    });

    test("o curso trocado saiu da trilha depois que a tela abriu: recusa", () => {
      expect(decidirLiberar(trocouC1, pedirTrilha([C1]), [C2])).toEqual({
        tipo: "trocados_mudaram",
      });
    });

    test("a ordem dos vistos não importa", () => {
      const trocouOsDois = [
        ...trocouC1,
        linha({ alvo: curso(C2), origem: "troca" }),
      ];
      expect(
        decidirLiberar(trocouOsDois, pedirTrilha([C2, C1]), [C1, C2])
      ).toEqual({ tipo: "inserir" });
    });

    test("curso liberado pelo admin não conta como trocado", () => {
      const doAdmin = [linha({ alvo: curso(C1) })];
      expect(decidirLiberar(doAdmin, pedirTrilha([]), [C1])).toEqual({
        tipo: "inserir",
      });
    });

    test("trilha já liberada devolve a liberação, mesmo com troca nova", () => {
      const ativa = linha({ alvo: trilha });
      expect(
        decidirLiberar([ativa, ...trocouC1], pedirTrilha([]), [C1])
      ).toEqual({ liberacaoId: ativa.id, tipo: "ja_liberada" });
    });
  });
});

describe("montarAcesso", () => {
  const pessoa: Pessoa = {
    email: "ana@exemplo.com",
    foto: null,
    nome: "Ana",
    userId: "user_ana",
  };
  const catalogo: LinhasDoAcesso["catalogo"] = {
    cursos: [
      { id: C1, status: "publicado", titulo: "BPF", trilhaId: T1 },
      { id: C2, status: "publicado", titulo: "APPCC", trilhaId: T1 },
      { id: SOLTO, status: "em_producao", titulo: "Excel", trilhaId: null },
    ],
    trilhas: [{ id: T1, titulo: "Gestão" }],
  };
  const acessoDe = (
    userId: string,
    quem: Pessoa | null,
    liberacoes: LinhasDoAcesso["liberacoes"],
    historico: LinhasHistorico = SEM_HISTORICO
  ) => montarAcesso(userId, quem, { catalogo, historico, liberacoes }, HOJE);

  test("marca o que está liberado e lista na trilha os cursos trocados", () => {
    const acesso = acessoDe("user_ana", pessoa, [
      linha({ alvo: curso(C1, "BPF"), origem: "troca" }),
      linha({ alvo: curso(SOLTO, "Excel") }),
      linha({ alvo: curso(C2, "APPCC"), revogadaEm: new Date() }),
    ]);
    expect(acesso?.cursos.map((c) => [c.alvo.titulo, c.liberado])).toEqual([
      ["BPF", true],
      ["APPCC", false],
      ["Excel", true],
    ]);
    expect(acesso?.trilhas).toEqual([
      {
        alvo: { id: T1, tipo: "trilha", titulo: "Gestão" },
        liberado: false,
        trocadosNaTrilha: [{ id: C1, titulo: "BPF" }],
      },
    ]);
  });

  test("curso diz se está em produção e se a pessoa já o alcança por uma trilha liberada", () => {
    const acesso = acessoDe("user_ana", pessoa, [linha({ alvo: trilha })]);
    expect(
      acesso?.cursos.map((c) => [c.alvo.titulo, c.emProducao, c.pelaTrilha])
    ).toEqual([
      ["BPF", false, "Gestão"],
      ["APPCC", false, "Gestão"],
      ["Excel", true, null],
    ]);
  });

  test("trilha revogada não cobre mais o curso", () => {
    const acesso = acessoDe("user_ana", pessoa, [
      linha({ alvo: trilha, revogadaEm: new Date() }),
    ]);
    expect(acesso?.cursos.map((c) => c.pelaTrilha)).toEqual([null, null, null]);
  });

  test("ativas primeiro, a mais recente antes; revogadas no fim", () => {
    const dia = (d: number) => new Date(Date.UTC(2026, 9, d, 12));
    const acesso = acessoDe("user_ana", pessoa, [
      linha({ alvo: curso(C2), liberadaEm: dia(1), revogadaEm: dia(3) }),
      linha({ alvo: curso(C1), liberadaEm: dia(2) }),
      linha({ alvo: trilha, liberadaEm: dia(4) }),
    ]);
    expect(acesso?.liberacoes.map((l) => [l.alvo.id, l.acao.tipo])).toEqual([
      [T1, "revogar"],
      [C1, "revogar"],
      [C2, "revogada"],
    ]);
  });

  test("pessoa apagada do Clerk com liberação ativa ainda aparece, para revogar", () => {
    const acesso = acessoDe("user_sumiu", null, [linha({ alvo: trilha })]);
    expect(acesso).toMatchObject({ pessoa: null, userId: "user_sumiu" });
    expect(acesso?.liberacoes[0]?.acao).toEqual({ tipo: "revogar" });
  });

  test("pessoa apagada continua com tela depois da última revogação", () => {
    const revogada = linha({ alvo: trilha, revogadaEm: new Date() });
    expect(acessoDe("user_sumiu", null, [revogada])?.liberacoes).toHaveLength(
      1
    );
  });

  test("userId sem pessoa no Clerk e sem liberação não tem tela", () => {
    expect(acessoDe("user_ninguem", null, [])).toBeNull();
  });

  test("devolve o dia de hoje para a tela escrever as datas", () => {
    expect(acessoDe("user_ana", pessoa, [])?.hoje).toBe(HOJE);
  });

  test("cada liberação traz o acompanhamento; a revogada também, com a mesma regra", () => {
    const historico: LinhasHistorico = {
      ...SEM_HISTORICO,
      assistidas: [
        {
          assistidaEm: new Date("2026-09-21T15:00:00Z"),
          aulaId: idAula(C2, 0, 1),
        },
      ],
    };
    const [ativa, revogada] =
      acessoDe(
        "user_ana",
        pessoa,
        [
          linha({ alvo: curso(C1, "BPF") }),
          linha({
            alvo: curso(C2, "APPCC"),
            conteudo: {
              curso: { ...cursoCat(C2, { aulas: [5] }), titulo: "APPCC" },
              tipo: "curso",
            },
            revogadaEm: new Date("2026-10-02T15:00:00Z"),
          }),
        ],
        historico
      )?.liberacoes ?? [];
    expect(ativa?.acompanhamento).toEqual({
      curso: {
        progresso: { feitas: 0, pct: 0, total: 1 },
        situacao: { tipo: "nunca_abriu" },
        titulo: "BPF",
      },
      tipo: "curso",
    });
    expect(revogada?.acompanhamento).toEqual({
      curso: {
        progresso: { feitas: 1, pct: 20, total: 5 },
        situacao: {
          onde: { aula: 2, modulo: 0 },
          tipo: "estudando",
          ultimoEstudo: "2026-09-21" as DiaISO,
        },
        titulo: "APPCC",
      },
      tipo: "curso",
    });
  });

  test("na trilha, o curso liberado direto não espera o anterior", () => {
    const trilhaComCursos = {
      ...trilhaCat(T1, [
        cursoCat(C1, { aulas: [1] }),
        cursoCat(C2, { aulas: [1] }),
      ]),
      titulo: "Gestão",
    };
    const [doTrilha] = (
      acessoDe("user_ana", pessoa, [
        linha({
          alvo: trilha,
          conteudo: { tipo: "trilha", trilha: trilhaComCursos },
          liberadaEm: new Date("2026-10-03T12:00:00Z"),
        }),
        linha({ alvo: curso(C2, "APPCC") }),
      ])?.liberacoes ?? []
    ).map((l) => l.acompanhamento);
    expect(
      doTrilha?.tipo === "trilha" && doTrilha.cursos.map((c) => c.situacao)
    ).toEqual([{ tipo: "nunca_abriu" }, { tipo: "nunca_abriu" }]);
  });
});
