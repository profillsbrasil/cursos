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
import { liberacaoOrigem, momento, tabela } from "./comum";

export const liberacao = tabela(
  "liberacao",
  {
    cursoId: uuid()
      .notNull()
      .references(() => curso.id, { onDelete: "restrict" }),
    id: uuid().primaryKey().defaultRandom(),
    liberadaEm: momento(),
    liberadaPor: text().notNull(),
    // Sem default: todo INSERT diz de onde veio a liberação.
    origem: liberacaoOrigem().notNull(),
    revogadaEm: timestamp({ withTimezone: true }),
    revogadaPor: text(),
    userId: text().notNull(), // userId do Clerk
  },
  (t) => [
    check("liberacao_user_id_clerk", sql`${t.userId} ~ '^user_[A-Za-z0-9]+$'`),
    check(
      "liberacao_revogacao_coerente",
      sql`(${t.revogadaEm} is null) = (${t.revogadaPor} is null)
          and (${t.revogadaEm} is null or ${t.revogadaEm} >= ${t.liberadaEm})`
    ),
    // ::text pelo mesmo padrão dos checks de ponto_lancamento. Lá ele é obrigatório: a
    // migração troca faz ALTER TYPE ... ADD VALUE, e o Postgres recusa o valor novo na
    // mesma transação. Aqui o enum nasce com CREATE TYPE, que não tem essa regra.
    check(
      "liberacao_troca_nao_revoga",
      sql`${t.revogadaEm} is null or ${t.origem}::text <> 'troca'`
    ),
    check(
      "liberacao_troca_pelo_aluno",
      sql`${t.origem}::text <> 'troca' or ${t.liberadaPor} = ${t.userId}`
    ),
    unique("liberacao_do_aluno").on(t.userId, t.id), // alvo da FK composta do lançamento de troca
    // Uma liberação ativa por curso. Revogar e liberar de novo continua possível.
    uniqueIndex("liberacao_curso_ativa_unica")
      .on(t.userId, t.cursoId)
      .where(sql`${t.revogadaEm} is null`),
    index("liberacao_ativa_por_pessoa")
      .on(t.userId)
      .where(sql`${t.revogadaEm} is null`),
  ]
);
