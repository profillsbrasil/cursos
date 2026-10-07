import type { Database } from "@cursos/db";

export type Transacao = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Executor = Database | Transacao;

export const ativaDo = (userId: string) =>
  ({ revogadaEm: { isNull: true }, userId }) as const;

export const ativasDo = (userId: string) =>
  ({ columns: { id: true }, where: ativaDo(userId) }) as const;
