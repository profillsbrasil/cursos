import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { trilha } from "./catalogo";
import { momento, motivoPonto, tabela } from "./comum";
import { aulaAssistida, certificado } from "./estudo";

// Livro-razão imutável. Cada lançamento aponta para exatamente um fato do mesmo aluno.
export const pontoLancamento = tabela(
  "ponto_lancamento",
  {
    aulaId: uuid(),
    criadoEm: momento(),
    cursoId: uuid(),
    diaMarco: date({ mode: "string" }), // dia útil que fechou o bloco de 7
    id: uuid().primaryKey().defaultRandom(),
    motivo: motivoPonto().notNull(),
    pontos: integer().notNull(), // valor da regra no momento
    trilhaId: uuid().references(() => trilha.id, { onDelete: "restrict" }),
    userId: text().notNull(),
  },
  (t) => [
    check(
      "ponto_lancamento_referencia",
      sql`num_nonnulls(${t.aulaId}, ${t.cursoId}, ${t.trilhaId}, ${t.diaMarco}) = 1
          and case ${t.motivo}
            when 'aula_assistida' then ${t.aulaId} is not null
            when 'curso_concluido' then ${t.cursoId} is not null
            when 'trilha_concluida' then ${t.trilhaId} is not null
            when 'sequencia_7_dias' then ${t.diaMarco} is not null
          end`
    ),
    check("ponto_lancamento_positivo", sql`${t.pontos} > 0`),
    // NULL é distinto de NULL: cada unique só morde o motivo que preenche a coluna
    unique("ponto_aula_uma_vez").on(t.userId, t.aulaId),
    unique("ponto_curso_uma_vez").on(t.userId, t.cursoId),
    unique("ponto_trilha_uma_vez").on(t.userId, t.trilhaId),
    unique("ponto_sequencia_uma_vez").on(t.userId, t.diaMarco),
    foreignKey({
      columns: [t.userId, t.aulaId],
      foreignColumns: [aulaAssistida.userId, aulaAssistida.aulaId],
      name: "ponto_aula_assistida_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.userId, t.cursoId],
      foreignColumns: [certificado.userId, certificado.cursoId],
      name: "ponto_certificado_fk",
    }).onDelete("restrict"),
    index("ponto_lancamento_por_data").on(t.userId, t.criadoEm),
  ]
);
