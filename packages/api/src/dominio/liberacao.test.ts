import { describe, expect, test } from "bun:test";

import {
  acaoNaLiberacao,
  decidirLiberar,
  decidirRevogar,
  type LinhaDaLiberacao,
  type LinhasDoAcesso,
  montarAcesso,
} from "./liberacao";
import type { CursoId, LiberacaoId, Pessoa, TrilhaId } from "./tipos";

const T1 = "trilha-1" as TrilhaId;
const C1 = "curso-1" as CursoId;
const C2 = "curso-2" as CursoId;
const SOLTO = "curso-solto" as CursoId;

function linha(
  parcial: Partial<LinhaDaLiberacao> & Pick<LinhaDaLiberacao, "alvo">
): LinhaDaLiberacao {
  return {
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
      em: "2026-10-05T09:30:00.000Z",
      tipo: "revogada",
    });
  });
});

describe("decidirLiberar", () => {
  test("alvo que não existe é recusado", () => {
    expect(decidirLiberar(false, [], trilha)).toEqual({
      recusa: "alvo_desconhecido",
      tipo: "recusa",
    });
  });

  test("sem liberação ativa do alvo, insere", () => {
    const outras = [linha({ alvo: curso(C1) })];
    expect(decidirLiberar(true, outras, { id: T1, tipo: "trilha" })).toEqual({
      tipo: "inserir",
    });
  });

  test("liberar de novo devolve a liberação ativa, sem inserir", () => {
    const ativa = linha({ alvo: trilha });
    expect(decidirLiberar(true, [ativa], { id: T1, tipo: "trilha" })).toEqual({
      liberacaoId: ativa.id,
      tipo: "ja_liberada",
    });
  });

  test("curso que o aluno trocou já está liberado", () => {
    const troca = linha({ alvo: curso(C1), origem: "troca" });
    expect(decidirLiberar(true, [troca], { id: C1, tipo: "curso" })).toEqual({
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
      decidirLiberar(true, [ativa], { id: mesmo as CursoId, tipo: "curso" })
    ).toEqual({ tipo: "inserir" });
  });
});

describe("decidirRevogar", () => {
  test("revoga liberação de admin ativa", () => {
    expect(decidirRevogar(linha({ alvo: trilha }))).toEqual({
      tipo: "revogar",
    });
  });

  test("revogar de novo não muda nada", () => {
    const revogada = linha({ alvo: trilha, revogadaEm: new Date() });
    expect(decidirRevogar(revogada)).toEqual({ tipo: "ja_revogada" });
  });

  test("recusa revogar troca", () => {
    expect(decidirRevogar(linha({ alvo: curso(C1), origem: "troca" }))).toEqual(
      { recusa: "troca", tipo: "recusa" }
    );
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
      { id: C1, titulo: "BPF", trilhaId: T1 },
      { id: C2, titulo: "APPCC", trilhaId: T1 },
      { id: SOLTO, titulo: "Excel", trilhaId: null },
    ],
    trilhas: [{ id: T1, titulo: "Gestão" }],
  };

  test("marca o que está liberado e lista na trilha os cursos trocados", () => {
    const acesso = montarAcesso("user_ana", pessoa, {
      catalogo,
      liberacoes: [
        linha({ alvo: curso(C1, "BPF"), origem: "troca" }),
        linha({ alvo: curso(SOLTO, "Excel") }),
        linha({ alvo: curso(C2, "APPCC"), revogadaEm: new Date() }),
      ],
    });
    expect(acesso?.cursos.map((c) => [c.alvo.titulo, c.liberado])).toEqual([
      ["BPF", true],
      ["APPCC", false],
      ["Excel", true],
    ]);
    expect(acesso?.trilhas).toEqual([
      {
        alvo: { id: T1, tipo: "trilha", titulo: "Gestão" },
        liberado: false,
        trocadosNaTrilha: ["BPF"],
      },
    ]);
  });

  test("ativas primeiro, a mais recente antes; revogadas no fim", () => {
    const dia = (d: number) => new Date(Date.UTC(2026, 9, d, 12));
    const acesso = montarAcesso("user_ana", pessoa, {
      catalogo,
      liberacoes: [
        linha({ alvo: curso(C2), liberadaEm: dia(1), revogadaEm: dia(3) }),
        linha({ alvo: curso(C1), liberadaEm: dia(2) }),
        linha({ alvo: trilha, liberadaEm: dia(4) }),
      ],
    });
    expect(acesso?.liberacoes.map((l) => [l.alvo.id, l.acao.tipo])).toEqual([
      [T1, "revogar"],
      [C1, "revogar"],
      [C2, "revogada"],
    ]);
  });

  test("pessoa apagada do Clerk com liberação ativa ainda aparece, para revogar", () => {
    const acesso = montarAcesso("user_sumiu", null, {
      catalogo,
      liberacoes: [linha({ alvo: trilha })],
    });
    expect(acesso).toMatchObject({ pessoa: null, userId: "user_sumiu" });
    expect(acesso?.liberacoes[0]?.acao).toEqual({ tipo: "revogar" });
  });

  test("pessoa apagada continua com tela depois da última revogação", () => {
    const revogada = linha({ alvo: trilha, revogadaEm: new Date() });
    expect(
      montarAcesso("user_sumiu", null, { catalogo, liberacoes: [revogada] })
        ?.liberacoes
    ).toHaveLength(1);
  });

  test("userId sem pessoa no Clerk e sem liberação não tem tela", () => {
    expect(
      montarAcesso("user_ninguem", null, { catalogo, liberacoes: [] })
    ).toBeNull();
  });
});
