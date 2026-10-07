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

import { curso, trilha } from "./catalogo";
import { momento, tabela } from "./comum";

export const liberacao = tabela(
  "liberacao",
  {
    cursoId: uuid().references(() => curso.id, { onDelete: "restrict" }),
    id: uuid().primaryKey().defaultRandom(),
    liberadaEm: momento(),
    liberadaPor: text().notNull(), // userId de quem liberou: o admin, ou o próprio aluno na troca
    revogadaEm: timestamp({ withTimezone: true }),
    revogadaPor: text(),
    trilhaId: uuid().references(() => trilha.id, { onDelete: "restrict" }),
    userId: text().notNull(), // userId do Clerk
  },
  (t) => [
    check("liberacao_user_id_clerk", sql`${t.userId} ~ '^user_[A-Za-z0-9]+$'`),
    check(
      "liberacao_alvo_unico",
      sql`num_nonnulls(${t.trilhaId}, ${t.cursoId}) = 1`
    ),
    check(
      "liberacao_revogacao_coerente",
      sql`(${t.revogadaEm} is null) = (${t.revogadaPor} is null)
          and (${t.revogadaEm} is null or ${t.revogadaEm} >= ${t.liberadaEm})`
    ),
    unique("liberacao_do_aluno").on(t.userId, t.id), // alvo da FK composta do lançamento de troca
    // Uma liberação ativa por alvo. Revogar e liberar de novo continua possível.
    uniqueIndex("liberacao_trilha_ativa_unica")
      .on(t.userId, t.trilhaId)
      .where(sql`${t.revogadaEm} is null and ${t.trilhaId} is not null`),
    uniqueIndex("liberacao_curso_ativa_unica")
      .on(t.userId, t.cursoId)
      .where(sql`${t.revogadaEm} is null and ${t.cursoId} is not null`),
    index("liberacao_ativa_por_pessoa")
      .on(t.userId)
      .where(sql`${t.revogadaEm} is null`),
  ]
);
