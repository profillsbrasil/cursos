import type { Database } from "@cursos/db";

export type Transacao = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Executor = Database | Transacao;

/** Filtro de liberação ativa do aluno, para `where` da relational query. */
export const ativaDo = (userId: string) =>
  ({ revogadaEm: { isNull: true }, userId }) as const;

/** Relação `liberacoes` reduzida às ativas do aluno: só importa se existe alguma. */
export const ativasDo = (userId: string) =>
  ({ columns: { id: true }, where: ativaDo(userId) }) as const;
