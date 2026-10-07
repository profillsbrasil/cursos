import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  primaryKey,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { aula, curso } from "./catalogo";
import { momento, tabela } from "./comum";

// Fato imutável. A chave (user_id, aula_id) faz "rever aula" não gravar de novo.
export const aulaAssistida = tabela(
  "aula_assistida",
  {
    assistidaEm: momento(),
    aulaId: uuid()
      .notNull()
      .references(() => aula.id, { onDelete: "restrict" }),
    // dia civil de São Paulo; o SQL é texto porque a coluna não enxerga a tabela aqui
    dia: date({ mode: "string" })
      .notNull()
      .generatedAlwaysAs(
        sql`((assistida_em at time zone 'America/Sao_Paulo')::date)`
      ),
    userId: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.aulaId] }),
    index("aula_assistida_por_dia").on(t.userId, t.dia),
  ]
);

// Estado mutável do player: um registro por aluno e aula, sobrescrito.
export const posicaoAula = tabela(
  "posicao_aula",
  {
    atualizadaEm: momento(),
    aulaId: uuid()
      .notNull()
      .references(() => aula.id, { onDelete: "cascade" }),
    posicaoSeg: integer().notNull(),
    userId: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.aulaId] }),
    check("posicao_aula_nao_negativa", sql`${t.posicaoSeg} >= 0`),
  ]
);

// O PR da prova acrescenta prova_tentativa_id (FK composta para a tentativa aprovada).
// O seed com --cloud já cria um certificado de exemplo para o aluno A, sem tentativa.
// Por isso a coluna nova tem de nascer anulável (ou o PR apaga antes esse certificado
// e o ponto_lancamento que o referencia, por causa do ON DELETE RESTRICT).
export const certificado = tabela(
  "certificado",
  {
    codigo: text().notNull().unique(),
    cursoId: uuid()
      .notNull()
      .references(() => curso.id, { onDelete: "restrict" }),
    emitidoEm: momento(),
    id: uuid().primaryKey().defaultRandom(),
    userId: text().notNull(),
  },
  (t) => [unique("certificado_um_por_curso").on(t.userId, t.cursoId)]
);
