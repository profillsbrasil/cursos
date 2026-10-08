// Uma regra decide se uma liberação se revoga: acaoNaLiberacao. A tela mostra o
// botão a partir dela e decidirRevogar recusa a partir dela. O check
// liberacao_troca_nao_revoga é a última porta, no banco.

import type {
  CursoId,
  LiberacaoId,
  OrigemDaLiberacao,
  Pessoa,
  TrilhaId,
} from "./tipos";

export type Alvo =
  | { tipo: "trilha"; id: TrilhaId }
  | { tipo: "curso"; id: CursoId };

export type AlvoComTitulo = Alvo & { titulo: string };

/** Linha de liberacao com o título do alvo, como consultas/liberacao.ts lê. */
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
  | { tipo: "revogada"; em: string };

export function acaoNaLiberacao(l: LinhaDaLiberacao): AcaoNaLiberacao {
  if (l.revogadaEm) {
    return { em: l.revogadaEm.toISOString(), tipo: "revogada" };
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

export type DecisaoDeLiberar =
  | { tipo: "inserir" }
  | { tipo: "ja_liberada"; liberacaoId: LiberacaoId }
  | { tipo: "recusa"; recusa: "alvo_desconhecido" };

/**
 * `ativas` são as liberações ativas do aluno, lidas depois da trava dele, e
 * `alvoExiste` vem da mesma transação. Liberar o que já está ativo devolve a
 * liberação existente, de qualquer origem: o segundo clique não gera erro nem
 * linha nova. Liberar curso que o aluno já alcança pela trilha é permitido, e a
 * liberação direta tira o curso da ordem da trilha.
 */
export function decidirLiberar(
  alvoExiste: boolean,
  ativas: readonly LinhaDaLiberacao[],
  alvo: Alvo
): DecisaoDeLiberar {
  if (!alvoExiste) {
    return { recusa: "alvo_desconhecido", tipo: "recusa" };
  }
  const existente = ativas.find(
    (l) => l.revogadaEm === null && mesmoAlvo(l.alvo, alvo)
  );
  return existente
    ? { liberacaoId: existente.id, tipo: "ja_liberada" }
    : { tipo: "inserir" };
}

export type DecisaoDeRevogar =
  | { tipo: "revogar" }
  | { tipo: "ja_revogada" }
  | { tipo: "recusa"; recusa: "troca" };

export function decidirRevogar(l: LinhaDaLiberacao): DecisaoDeRevogar {
  const acao = acaoNaLiberacao(l);
  switch (acao.tipo) {
    case "revogar":
      return { tipo: "revogar" };
    case "revogada":
      return { tipo: "ja_revogada" };
    case "fixa_por_troca":
      return { recusa: "troca", tipo: "recusa" };
    default:
      return acao satisfies never;
  }
}

/** O que a tela /admin/alunos/[userId] mostra de cada liberação. */
export interface LiberacaoNaTela {
  acao: AcaoNaLiberacao;
  alvo: AlvoComTitulo;
  id: LiberacaoId;
  liberadaEm: string;
  origem: OrigemDaLiberacao;
}

export interface AlvoNaTela {
  alvo: AlvoComTitulo;
  /** Já tem liberação ativa direta deste alvo, de qualquer origem. */
  liberado: boolean;
  /**
   * Só em trilha: cursos dela que o aluno trocou por pontos. A confirmação
   * avisa que os pontos não voltam quando a trilha passa a cobrir o curso.
   */
  trocadosNaTrilha: readonly string[];
}

export interface AcessoDoAluno {
  cursos: readonly AlvoNaTela[];
  /** Ativas primeiro, a mais recente antes; depois as revogadas. */
  liberacoes: readonly LiberacaoNaTela[];
  /** null: o Clerk não conhece mais o userId. A tela mostra o userId e não oferece liberar. */
  pessoa: Pessoa | null;
  trilhas: readonly AlvoNaTela[];
  userId: string;
}

export interface LinhasDoAcesso {
  catalogo: {
    cursos: readonly {
      id: CursoId;
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

/**
 * null quando o Clerk não conhece a pessoa e ela não tem liberação ativa: não
 * há nada a mostrar nem a revogar.
 */
export function montarAcesso(
  userId: string,
  pessoa: Pessoa | null,
  linhas: LinhasDoAcesso
): AcessoDoAluno | null {
  const ativas = linhas.liberacoes.filter((l) => l.revogadaEm === null);
  if (!pessoa && ativas.length === 0) {
    return null;
  }
  const liberado = (alvo: Alvo) => ativas.some((l) => mesmoAlvo(l.alvo, alvo));
  const trocados = new Set(
    ativas.flatMap((l) =>
      l.origem === "troca" && l.alvo.tipo === "curso" ? [l.alvo.id] : []
    )
  );
  const cursos = linhas.catalogo.cursos.map(
    (c): AlvoNaTela => ({
      alvo: { id: c.id, tipo: "curso", titulo: c.titulo },
      liberado: liberado({ id: c.id, tipo: "curso" }),
      trocadosNaTrilha: [],
    })
  );
  const trilhas = linhas.catalogo.trilhas.map(
    (t): AlvoNaTela => ({
      alvo: { id: t.id, tipo: "trilha", titulo: t.titulo },
      liberado: liberado({ id: t.id, tipo: "trilha" }),
      trocadosNaTrilha: linhas.catalogo.cursos
        .filter((c) => c.trilhaId === t.id && trocados.has(c.id))
        .map((c) => c.titulo),
    })
  );
  return {
    cursos,
    liberacoes: [...linhas.liberacoes].sort(ordemNaTela).map((l) => ({
      acao: acaoNaLiberacao(l),
      alvo: l.alvo,
      id: l.id,
      liberadaEm: l.liberadaEm.toISOString(),
      origem: l.origem,
    })),
    pessoa,
    trilhas,
    userId,
  };
}
