import type { Database } from "@cursos/db";
import { type AnyColumn, isNull } from "drizzle-orm";

export type Transacao = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Executor = Database | Transacao;

export const COLUNAS_DA_CAPA = {
  capaAlt: true,
  capaAltura: true,
  capaLargura: true,
  capaUrl: true,
} as const;

export const filtroLiberacaoAtiva = (userId: string) =>
  ({ revogadaEm: { isNull: true }, userId }) as const;

/** O par de filtroLiberacaoAtiva para SQL escrito à mão, com a tabela ou um alias dela. */
export const liberacaoAtiva = (l: { revogadaEm: AnyColumn }) =>
  isNull(l.revogadaEm);

export const relacaoLiberacoesAtivas = (userId: string) =>
  ({ columns: { id: true }, where: filtroLiberacaoAtiva(userId) }) as const;
