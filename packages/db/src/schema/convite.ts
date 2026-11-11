import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { curso } from "./catalogo";
import { momento, perfil, tabela } from "./comum";

/**
 * O convite por e-mail. A linha é a fonte do estado e do que a pessoa recebe no
 * primeiro acesso. O convite do Clerk (clerkConviteId) só carrega o link.
 */
export const convite = tabela(
  "convite",
  {
    aceitoEm: timestamp({ withTimezone: true }),
    aceitoPor: text(), // userId do Clerk de quem chegou
    canceladoEm: timestamp({ withTimezone: true }),
    canceladoPor: text(),
    clerkConviteId: text(),
    comoAdmin: boolean().notNull(),
    convidadoEm: momento(),
    convidadoPor: text().notNull(),
    email: text().notNull(),
    enviadoEm: timestamp({ withTimezone: true }),
    expiraEm: timestamp({ withTimezone: true }).notNull(),
    id: uuid().primaryKey().defaultRandom(),
    papelAplicadoEm: timestamp({ withTimezone: true }),
    perfil: perfil().notNull(),
  },
  (t) => [
    // A mesma regra de lerEmail (dominio/convite.ts do @cursos/api).
    check(
      "convite_email_formato",
      sql`${t.email} = lower(btrim(${t.email}))
          and char_length(${t.email}) <= 254
          and ${t.email} ~ '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'`
    ),
    check(
      "convite_convidado_por_clerk",
      sql`${t.convidadoPor} ~ '^user_[A-Za-z0-9]+$'`
    ),
    check(
      "convite_envio_coerente",
      sql`(${t.enviadoEm} is null) = (${t.clerkConviteId} is null)`
    ),
    check(
      "convite_aceite_coerente",
      sql`(${t.aceitoEm} is null) = (${t.aceitoPor} is null)
          and (${t.aceitoPor} is null or ${t.aceitoPor} ~ '^user_[A-Za-z0-9]+$')`
    ),
    check(
      "convite_cancelamento_coerente",
      sql`(${t.canceladoEm} is null) = (${t.canceladoPor} is null)`
    ),
    check(
      "convite_um_fim_so",
      sql`${t.aceitoEm} is null or ${t.canceladoEm} is null`
    ),
    check(
      "convite_papel_aplicado_coerente",
      sql`${t.papelAplicadoEm} is null or (${t.comoAdmin} and ${t.aceitoEm} is not null)`
    ),
    // O expirado continua vivo, e ocupa o e-mail, até o admin reenviar ou cancelar.
    uniqueIndex("convite_vivo_por_email")
      .on(t.email)
      .where(sql`${t.aceitoEm} is null and ${t.canceladoEm} is null`),
    // Uma pessoa aceita um convite só, e a sonda do papel por aplicar lê por aqui.
    uniqueIndex("convite_aceito_por_unico")
      .on(t.aceitoPor)
      .where(sql`${t.aceitoPor} is not null`),
  ]
);

/** Os cursos que o convite libera na chegada. */
export const conviteCurso = tabela(
  "convite_curso",
  {
    conviteId: uuid()
      .notNull()
      .references(() => convite.id, { onDelete: "cascade" }),
    // cascade: convite pendente não segura o apagamento de um curso.
    cursoId: uuid()
      .notNull()
      .references(() => curso.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.conviteId, t.cursoId] })]
);
