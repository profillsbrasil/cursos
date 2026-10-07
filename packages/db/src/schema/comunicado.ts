import { index, text, uuid } from "drizzle-orm/pg-core";

import { curso } from "./catalogo";
import { momento, tabela } from "./comum";

export const comunicado = tabela(
  "comunicado",
  {
    cursoId: uuid().references(() => curso.id, { onDelete: "cascade" }), // null: geral
    id: uuid().primaryKey().defaultRandom(),
    publicadoEm: momento(),
    publicadoPor: text().notNull(),
    texto: text().notNull(),
    titulo: text().notNull(),
  },
  (t) => [index("comunicado_recentes").on(t.publicadoEm.desc())]
);
