// Uma regra decide se uma liberação se revoga: acaoNaLiberacao. A tela mostra o
// botão a partir dela e revogar, em consultas/liberacao.ts, recusa a partir dela.
// O check liberacao_troca_nao_revoga é a última porta, no banco.

import {
  type Acompanhamento,
  acompanharCurso,
  estudoDe,
} from "./acompanhamento";
import type { LinhasHistorico } from "./historico";
import type {
  CursoCatalogo,
  CursoId,
  DiaISO,
  LiberacaoId,
  OrigemDaLiberacao,
  Pessoa,
  StatusDoCurso,
} from "./tipos";

/** O curso de uma liberação, como a tela o nomeia. */
export interface CursoLiberado {
  id: CursoId;
  titulo: string;
}

/** Linha de liberacao com o curso, módulos e aulas, como a tela de acesso lê. */
export interface LinhaDaLiberacao {
  curso: CursoCatalogo;
  id: LiberacaoId;
  liberadaEm: Date;
  origem: OrigemDaLiberacao;
  revogadaEm: Date | null;
}

export type AcaoNaLiberacao =
  | { tipo: "revogar" }
  | { tipo: "fixa_por_troca" }
  | { tipo: "revogada"; em: Date };

export function acaoNaLiberacao(
  l: Pick<LinhaDaLiberacao, "origem" | "revogadaEm">
): AcaoNaLiberacao {
  if (l.revogadaEm) {
    return { em: l.revogadaEm, tipo: "revogada" };
  }
  switch (l.origem) {
    case "troca":
      return { tipo: "fixa_por_troca" };
    case "admin":
      return { tipo: "revogar" };
    default:
      return l.origem satisfies never;
  }
}

/** A ação como a tela recebe: a data já em texto. */
export type AcaoNaTela =
  | Exclude<AcaoNaLiberacao, { tipo: "revogada" }>
  | { tipo: "revogada"; em: string };

/** O que a tela /admin/alunos/[userId] mostra de cada liberação. */
export interface LiberacaoNaTela {
  acao: AcaoNaTela;
  /** Na revogada, o estudo de hoje no curso, com a mesma regra da ativa. */
  acompanhamento: Acompanhamento;
  curso: CursoLiberado;
  id: LiberacaoId;
  liberadaEm: string;
  origem: OrigemDaLiberacao;
}

export interface CursoParaLiberar {
  curso: CursoLiberado;
  /** O aluno vê o curso como "em breve" até ele ser publicado. */
  emProducao: boolean;
  /** Já tem liberação ativa do curso, de qualquer origem. */
  liberado: boolean;
}

export interface AcessoDoAluno {
  cursos: readonly CursoParaLiberar[];
  /** O dia de São Paulo em que o servidor montou a tela, para ela dizer "ontem". */
  hoje: DiaISO;
  /** Ativas primeiro, a mais recente antes; depois as revogadas. */
  liberacoes: readonly LiberacaoNaTela[];
  /** null: o Clerk não conhece mais o userId. A tela mostra o userId e não oferece liberar. */
  pessoa: Pessoa | null;
  userId: string;
}

export interface LinhasDoAcesso {
  catalogo: readonly { id: CursoId; status: StatusDoCurso; titulo: string }[];
  /** Aulas assistidas, posições e certificados da pessoa. */
  historico: LinhasHistorico;
  liberacoes: readonly LinhaDaLiberacao[];
}

const ordemNaTela = (a: LinhaDaLiberacao, b: LinhaDaLiberacao) =>
  Number(a.revogadaEm !== null) - Number(b.revogadaEm !== null) ||
  (b.revogadaEm?.getTime() ?? 0) - (a.revogadaEm?.getTime() ?? 0) ||
  b.liberadaEm.getTime() - a.liberadaEm.getTime();

function acaoNaTela(l: LinhaDaLiberacao): AcaoNaTela {
  const acao = acaoNaLiberacao(l);
  return acao.tipo === "revogada"
    ? { em: acao.em.toISOString(), tipo: "revogada" }
    : acao;
}

/**
 * null quando o Clerk não conhece a pessoa e ela nunca teve liberação: o userId
 * não é de ninguém. Com histórico, a tela continua aberta depois da última
 * revogação.
 */
export function montarAcesso(
  userId: string,
  pessoa: Pessoa | null,
  linhas: LinhasDoAcesso,
  hoje: DiaISO
): AcessoDoAluno | null {
  if (!pessoa && linhas.liberacoes.length === 0) {
    return null;
  }
  const ativos = new Set(
    linhas.liberacoes
      .filter((l) => l.revogadaEm === null)
      .map((l) => l.curso.id)
  );
  const estudo = estudoDe(linhas.historico);
  return {
    cursos: linhas.catalogo.map((c) => ({
      curso: { id: c.id, titulo: c.titulo },
      emProducao: c.status === "em_producao",
      liberado: ativos.has(c.id),
    })),
    hoje,
    liberacoes: [...linhas.liberacoes].sort(ordemNaTela).map((l) => ({
      acao: acaoNaTela(l),
      acompanhamento: acompanharCurso(l.curso, estudo),
      curso: { id: l.curso.id, titulo: l.curso.titulo },
      id: l.id,
      liberadaEm: l.liberadaEm.toISOString(),
      origem: l.origem,
    })),
    pessoa,
    userId,
  };
}
