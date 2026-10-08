// Uma regra decide se uma liberação se revoga: acaoNaLiberacao. A tela mostra o
// botão a partir dela e revogar, em consultas/liberacao.ts, recusa a partir dela.
// O check liberacao_troca_nao_revoga é a última porta, no banco.

import type {
  CursoId,
  LiberacaoId,
  OrigemDaLiberacao,
  Pessoa,
  StatusDoCurso,
  TrilhaId,
} from "./tipos";

export type Alvo =
  | { tipo: "trilha"; id: TrilhaId }
  | { tipo: "curso"; id: CursoId };

export type AlvoComTitulo = Alvo & { titulo: string };

/** Liberação ativa, como liberar lê depois da trava: sem o título do alvo. */
export interface LiberacaoAtiva {
  alvo: Alvo;
  id: LiberacaoId;
  origem: OrigemDaLiberacao;
}

/** Linha de liberacao com o título do alvo, como a tela de acesso lê. */
export interface LinhaDaLiberacao {
  alvo: AlvoComTitulo;
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

const mesmoAlvo = (a: Alvo, b: Alvo) => a.tipo === b.tipo && a.id === b.id;

/** A liberação ativa deste alvo, de qualquer origem. `ativas` já vêm sem as revogadas. */
export const ativaDoAlvo = <L extends { alvo: Alvo }>(
  ativas: readonly L[],
  alvo: Alvo
): L | undefined => ativas.find((l) => mesmoAlvo(l.alvo, alvo));

/** Os cursos da lista que o aluno tem por troca ativa. */
export const trocadosNaTrilha = <C extends { id: CursoId }>(
  ativas: readonly Pick<LiberacaoAtiva, "alvo" | "origem">[],
  cursosDaTrilha: readonly C[]
): C[] =>
  cursosDaTrilha.filter((c) =>
    ativas.some(
      (l) =>
        l.origem === "troca" && mesmoAlvo(l.alvo, { id: c.id, tipo: "curso" })
    )
  );

/**
 * O que a tela pede. Na trilha vão os cursos trocados que o aviso mostrou: os
 * pontos deles não voltam, e liberar sem ter visto o aviso é recusado.
 */
export type PedidoDeLiberar =
  | { tipo: "curso"; id: CursoId }
  | { tipo: "trilha"; id: TrilhaId; trocadosVistos: readonly CursoId[] };

export type DecisaoDeLiberar =
  | { tipo: "inserir" }
  | { tipo: "ja_liberada"; liberacaoId: LiberacaoId }
  | { tipo: "trocados_mudaram" };

const mesmosIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

/**
 * `ativas` são lidas depois da trava do aluno, e `cursosDaTrilha` são os cursos
 * da trilha pedida (vazio para curso). Liberar o que já está ativo devolve a
 * liberação existente, de qualquer origem: o segundo clique não gera erro nem
 * linha nova. Liberar curso que o aluno já alcança pela trilha é permitido, e a
 * liberação direta tira o curso da ordem da trilha.
 */
export function decidirLiberar(
  ativas: readonly LiberacaoAtiva[],
  pedido: PedidoDeLiberar,
  cursosDaTrilha: readonly CursoId[]
): DecisaoDeLiberar {
  const existente = ativaDoAlvo(ativas, pedido);
  if (existente) {
    return { liberacaoId: existente.id, tipo: "ja_liberada" };
  }
  if (pedido.tipo === "trilha") {
    const trocados = trocadosNaTrilha(
      ativas,
      cursosDaTrilha.map((id) => ({ id }))
    ).map((c) => c.id);
    if (!mesmosIds(trocados, pedido.trocadosVistos)) {
      return { tipo: "trocados_mudaram" };
    }
  }
  return { tipo: "inserir" };
}

/** A ação como a tela recebe: a data já em texto. */
export type AcaoNaTela =
  | Exclude<AcaoNaLiberacao, { tipo: "revogada" }>
  | { tipo: "revogada"; em: string };

/** O que a tela /admin/alunos/[userId] mostra de cada liberação. */
export interface LiberacaoNaTela {
  acao: AcaoNaTela;
  alvo: AlvoComTitulo;
  id: LiberacaoId;
  liberadaEm: string;
  origem: OrigemDaLiberacao;
}

export interface CursoParaLiberar {
  alvo: Extract<AlvoComTitulo, { tipo: "curso" }>;
  /** O aluno vê o curso como "em breve" até ele ser publicado. */
  emProducao: boolean;
  /** Já tem liberação ativa direta do curso, de qualquer origem. */
  liberado: boolean;
  /** Título da trilha liberada que já cobre o curso, ou null. */
  pelaTrilha: string | null;
}

export interface TrilhaParaLiberar {
  alvo: Extract<AlvoComTitulo, { tipo: "trilha" }>;
  liberado: boolean;
  /**
   * Cursos da trilha que o aluno trocou por pontos. A confirmação avisa que os
   * pontos não voltam, e o pedido devolve os ids como trocadosVistos.
   */
  trocadosNaTrilha: readonly { id: CursoId; titulo: string }[];
}

export interface AcessoDoAluno {
  cursos: readonly CursoParaLiberar[];
  /** Ativas primeiro, a mais recente antes; depois as revogadas. */
  liberacoes: readonly LiberacaoNaTela[];
  /** null: o Clerk não conhece mais o userId. A tela mostra o userId e não oferece liberar. */
  pessoa: Pessoa | null;
  trilhas: readonly TrilhaParaLiberar[];
  userId: string;
}

export interface LinhasDoAcesso {
  catalogo: {
    cursos: readonly {
      id: CursoId;
      status: StatusDoCurso;
      titulo: string;
      trilhaId: TrilhaId | null;
    }[];
    trilhas: readonly { id: TrilhaId; titulo: string }[];
  };
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
  linhas: LinhasDoAcesso
): AcessoDoAluno | null {
  if (!pessoa && linhas.liberacoes.length === 0) {
    return null;
  }
  const ativas = linhas.liberacoes.filter((l) => l.revogadaEm === null);
  const liberado = (alvo: Alvo) => ativaDoAlvo(ativas, alvo) !== undefined;
  const { cursos, trilhas } = linhas.catalogo;
  const trilhasLiberadas = new Map(
    trilhas
      .filter((t) => liberado({ id: t.id, tipo: "trilha" }))
      .map((t) => [t.id, t.titulo])
  );
  return {
    cursos: cursos.map((c) => ({
      alvo: { id: c.id, tipo: "curso", titulo: c.titulo },
      emProducao: c.status === "em_producao",
      liberado: liberado({ id: c.id, tipo: "curso" }),
      pelaTrilha: c.trilhaId
        ? (trilhasLiberadas.get(c.trilhaId) ?? null)
        : null,
    })),
    liberacoes: [...linhas.liberacoes].sort(ordemNaTela).map((l) => ({
      acao: acaoNaTela(l),
      alvo: l.alvo,
      id: l.id,
      liberadaEm: l.liberadaEm.toISOString(),
      origem: l.origem,
    })),
    pessoa,
    trilhas: trilhas.map((t) => ({
      alvo: { id: t.id, tipo: "trilha", titulo: t.titulo },
      liberado: liberado({ id: t.id, tipo: "trilha" }),
      trocadosNaTrilha: trocadosNaTrilha(
        ativas,
        cursos.filter((c) => c.trilhaId === t.id)
      ).map((c) => ({ id: c.id, titulo: c.titulo })),
    })),
    userId,
  };
}
