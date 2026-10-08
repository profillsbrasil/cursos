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

import { liberacao } from "./acesso";
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
    liberacaoId: uuid(),
    motivo: motivoPonto().notNull(),
    pontos: integer().notNull(),
    trilhaId: uuid().references(() => trilha.id, { onDelete: "restrict" }),
    userId: text().notNull(),
  },
  (t) => [
    // ::text: o migrador roda tudo numa transação, e o literal 'troca', que entrou no enum
    // por ADD VALUE, daria "unsafe use of new value".
    check(
      "ponto_lancamento_referencia",
      sql`num_nonnulls(${t.aulaId}, ${t.cursoId}, ${t.trilhaId}, ${t.diaMarco}, ${t.liberacaoId}) = 1
          and case ${t.motivo}::text
            when 'aula_assistida' then ${t.aulaId} is not null
            when 'curso_concluido' then ${t.cursoId} is not null
            when 'trilha_concluida' then ${t.trilhaId} is not null
            when 'sequencia_7_dias' then ${t.diaMarco} is not null
            when 'troca' then ${t.liberacaoId} is not null
            else false
          end`
    ),
    check(
      "ponto_lancamento_sinal",
      sql`case ${t.motivo}::text when 'troca' then ${t.pontos} < 0 else ${t.pontos} > 0 end`
    ),
    // NULL é distinto de NULL: cada unique só morde o motivo que preenche a coluna
    unique("ponto_aula_uma_vez").on(t.userId, t.aulaId),
    unique("ponto_curso_uma_vez").on(t.userId, t.cursoId),
    unique("ponto_trilha_uma_vez").on(t.userId, t.trilhaId),
    unique("ponto_sequencia_uma_vez").on(t.userId, t.diaMarco),
    unique("ponto_troca_uma_vez").on(t.userId, t.liberacaoId),
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
    foreignKey({
      columns: [t.userId, t.liberacaoId],
      foreignColumns: [liberacao.userId, liberacao.id],
      name: "ponto_liberacao_fk",
    }).onDelete("restrict"),
    index("ponto_lancamento_por_data").on(t.userId, t.criadoEm),
  ]
);
