import type { Database } from "@cursos/db";
import { type AnyColumn, isNull } from "drizzle-orm";

import type { Aluno, Perfil } from "../dominio/perfil";

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

export const liberacaoAtiva = (l: { revogadaEm: AnyColumn }) =>
  isNull(l.revogadaEm);

export const relacaoLiberacoesAtivas = (userId: string) =>
  ({ columns: { id: true }, where: filtroLiberacaoAtiva(userId) }) as const;

export const filtroDoPerfilAtivo = (perfil: Perfil) =>
  ({ perfil, revogadaEm: { isNull: true } }) as const;

/** O curso que o aluno vê: liberação própria ativa ou liberação ativa do perfil dele. */
// Sem as const: o OR do Drizzle pede array mutável.
export const cursoQueOAlunoVe = (aluno: Aluno) => ({
  OR: [
    { liberacoes: filtroLiberacaoAtiva(aluno.userId) },
    { liberacoesDoPerfil: filtroDoPerfilAtivo(aluno.perfil) },
  ],
});

/** As duas relações que dizem se o aluno vê o curso, para o `with` de um curso. */
export const relacoesDoAcesso = (aluno: Aluno) =>
  ({
    liberacoes: relacaoLiberacoesAtivas(aluno.userId),
    liberacoesDoPerfil: {
      columns: { id: true },
      where: filtroDoPerfilAtivo(aluno.perfil),
    },
  }) as const;
