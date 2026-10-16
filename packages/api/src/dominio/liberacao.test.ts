import { describe, expect, test } from "bun:test";

import { cursoCat, idAula } from "./exemplo";
import type { LinhasHistorico } from "./historico";
import {
  acaoNaLiberacao,
  type LinhaDaLiberacao,
  type LinhasDoAcesso,
  montarAcesso,
} from "./liberacao";
import type { CursoId, DiaISO, LiberacaoId, Pessoa } from "./tipos";

const C1 = "curso-1" as CursoId;
const C2 = "curso-2" as CursoId;
const C3 = "curso-3" as CursoId;
const HOJE = "2026-10-14" as DiaISO;
const SEM_HISTORICO: LinhasHistorico = {
  assistidas: [],
  certificados: [],
  posicoes: [],
};

/** Curso de uma aula, o mínimo que a liberação lê. */
function linha(
  id: CursoId,
  parcial: Partial<LinhaDaLiberacao> & { titulo?: string } = {}
): LinhaDaLiberacao {
  const { titulo = id, ...resto } = parcial;
  return {
    curso: { ...cursoCat(id, { aulas: [1] }), titulo },
    id: `lib-${id}` as LiberacaoId,
    liberadaEm: new Date("2026-10-01T12:00:00Z"),
    origem: "admin",
    revogadaEm: null,
    ...resto,
  };
}

describe("acaoNaLiberacao", () => {
  test("liberação de admin ativa se revoga", () => {
    expect(acaoNaLiberacao(linha(C1))).toEqual({ tipo: "revogar" });
  });

  test("liberação de troca ativa fica fixa", () => {
    expect(acaoNaLiberacao(linha(C1, { origem: "troca" }))).toEqual({
      tipo: "fixa_por_troca",
    });
  });

  test("liberação revogada diz quando, qualquer que seja a origem", () => {
    const em = new Date("2026-10-05T09:30:00Z");
    expect(acaoNaLiberacao(linha(C1, { revogadaEm: em }))).toEqual({
      em,
      tipo: "revogada",
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
  const catalogo: LinhasDoAcesso["catalogo"] = [
    { id: C1, status: "publicado", titulo: "BPF" },
    { id: C2, status: "publicado", titulo: "APPCC" },
    { id: C3, status: "em_producao", titulo: "Excel" },
  ];
  const acessoDe = (
    userId: string,
    quem: Pessoa | null,
    liberacoes: LinhasDoAcesso["liberacoes"],
    historico: LinhasHistorico = SEM_HISTORICO
  ) => montarAcesso(userId, quem, { catalogo, historico, liberacoes }, HOJE);

  test("marca o que está liberado, de qualquer origem, e o que está em produção", () => {
    const acesso = acessoDe("user_ana", pessoa, [
      linha(C1, { origem: "troca", titulo: "BPF" }),
      linha(C3, { titulo: "Excel" }),
      linha(C2, { revogadaEm: new Date(), titulo: "APPCC" }),
    ]);
    expect(
      acesso?.cursos.map((c) => [c.curso.titulo, c.liberado, c.emProducao])
    ).toEqual([
      ["BPF", true, false],
      ["APPCC", false, false],
      ["Excel", true, true],
    ]);
  });

  test("ativas primeiro, a mais recente antes; revogadas no fim", () => {
    const dia = (d: number) => new Date(Date.UTC(2026, 9, d, 12));
    const acesso = acessoDe("user_ana", pessoa, [
      linha(C2, { liberadaEm: dia(1), revogadaEm: dia(3) }),
      linha(C1, { liberadaEm: dia(2) }),
      linha(C3, { liberadaEm: dia(4) }),
    ]);
    expect(acesso?.liberacoes.map((l) => [l.curso.id, l.acao.tipo])).toEqual([
      [C3, "revogar"],
      [C1, "revogar"],
      [C2, "revogada"],
    ]);
  });

  test("pessoa apagada do Clerk com liberação ativa ainda aparece, para revogar", () => {
    const acesso = acessoDe("user_sumiu", null, [linha(C1)]);
    expect(acesso).toMatchObject({ pessoa: null, userId: "user_sumiu" });
    expect(acesso?.liberacoes[0]?.acao).toEqual({ tipo: "revogar" });
  });

  test("pessoa apagada continua com tela depois da última revogação", () => {
    const revogada = linha(C1, { revogadaEm: new Date() });
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
    const [doC1, doC2] =
      acessoDe(
        "user_ana",
        pessoa,
        [
          linha(C1, { titulo: "BPF" }),
          linha(C2, {
            curso: { ...cursoCat(C2, { aulas: [5] }), titulo: "APPCC" },
            revogadaEm: new Date("2026-10-02T15:00:00Z"),
          }),
        ],
        historico
      )?.liberacoes ?? [];
    expect(doC1?.acompanhamento).toEqual({
      progresso: { feitas: 0, pct: 0, total: 1 },
      situacao: { tipo: "nunca_abriu" },
    });
    expect(doC2?.acompanhamento).toEqual({
      progresso: { feitas: 1, pct: 20, total: 5 },
      situacao: {
        onde: { aula: 2, modulo: 0 },
        tipo: "estudando",
        ultimoEstudo: "2026-09-21" as DiaISO,
      },
    });
  });
});
