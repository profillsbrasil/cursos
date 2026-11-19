import { sql } from "drizzle-orm";
import {
  check,
  index,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { curso } from "./catalogo";
import { liberacaoOrigem, momento, perfil, tabela } from "./comum";

/**
 * O perfil de quem já entrou no app. A linha nasce no primeiro acesso, com o
 * perfil do cadastro; definidoPor fica null até um admin mudar.
 */
export const perfilDaPessoa = tabela(
  "perfil_da_pessoa",
  {
    definidoEm: momento(),
    definidoPor: text(),
    perfil: perfil().notNull(),
    userId: text().primaryKey(),
  },
  (t) => [
    check(
      "perfil_da_pessoa_user_id_clerk",
      sql`${t.userId} ~ '^user_[A-Za-z0-9]+$'`
    ),
  ]
);

/** Um curso aberto a todo mundo de um perfil, inclusive a quem ganhar o perfil depois. */
export const liberacaoDoPerfil = tabela(
  "liberacao_do_perfil",
  {
    cursoId: uuid()
      .notNull()
      .references(() => curso.id, { onDelete: "restrict" }),
    id: uuid().primaryKey().defaultRandom(),
    liberadaEm: momento(),
    liberadaPor: text().notNull(),
    perfil: perfil().notNull(),
    revogadaEm: timestamp({ withTimezone: true }),
    revogadaPor: text(),
  },
  (t) => [
    check(
      "liberacao_do_perfil_revogacao_coerente",
      sql`(${t.revogadaEm} is null) = (${t.revogadaPor} is null)
          and (${t.revogadaEm} is null or ${t.revogadaEm} >= ${t.liberadaEm})`
    ),
    uniqueIndex("liberacao_do_perfil_ativa_unica")
      .on(t.perfil, t.cursoId)
      .where(sql`${t.revogadaEm} is null`),
  ]
);

export const liberacao = tabela(
  "liberacao",
  {
    cursoId: uuid()
      .notNull()
      .references(() => curso.id, { onDelete: "restrict" }),
    id: uuid().primaryKey().defaultRandom(),
    liberadaEm: momento(),
    liberadaPor: text().notNull(),
    origem: liberacaoOrigem().notNull(),
    revogadaEm: timestamp({ withTimezone: true }),
    revogadaPor: text(),
    userId: text().notNull(),
  },
  (t) => [
    check("liberacao_user_id_clerk", sql`${t.userId} ~ '^user_[A-Za-z0-9]+$'`),
    check(
      "liberacao_revogacao_coerente",
      sql`(${t.revogadaEm} is null) = (${t.revogadaPor} is null)
          and (${t.revogadaEm} is null or ${t.revogadaEm} >= ${t.liberadaEm})`
    ),
    // WARNING: o check usa ::text no enum; com ALTER TYPE ... ADD VALUE o Postgres recusa o valor novo na mesma transação.
    check(
      "liberacao_troca_nao_revoga",
      sql`${t.revogadaEm} is null or ${t.origem}::text <> 'troca'`
    ),
    check(
      "liberacao_troca_pelo_aluno",
      sql`${t.origem}::text <> 'troca' or ${t.liberadaPor} = ${t.userId}`
    ),
    unique("liberacao_do_aluno").on(t.userId, t.id),
    uniqueIndex("liberacao_curso_ativa_unica")
      .on(t.userId, t.cursoId)
      .where(sql`${t.revogadaEm} is null`),
    index("liberacao_ativa_por_pessoa")
      .on(t.userId)
      .where(sql`${t.revogadaEm} is null`),
  ]
);
