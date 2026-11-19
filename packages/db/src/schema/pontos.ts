import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { liberacao } from "./acesso";
import { momento, motivoPonto, tabela } from "./comum";
import { aulaAssistida, certificado, questionarioTentativa } from "./estudo";

/**
 * Fato imutável: o admin deu (pontos > 0) ou tirou (pontos < 0) pontos de uma
 * pessoa, com o motivo escrito. Nasce na mesma transação do lançamento que aponta
 * para ela (consultas/concessao.ts).
 */
export const concessaoDePontos = tabela(
  "concessao_de_pontos",
  {
    concedidaEm: momento(),
    concedidaPor: text().notNull(),
    id: uuid().primaryKey().defaultRandom(),
    motivo: text().notNull(),
    pontos: integer().notNull(),
    userId: text().notNull(),
  },
  (t) => [
    check(
      "concessao_de_pontos_user_id_clerk",
      sql`${t.userId} ~ '^user_[A-Za-z0-9]+$'`
    ),
    check("concessao_de_pontos_nao_zero", sql`${t.pontos} <> 0`),
    // WARNING: o teto de 200 repete MOTIVO_DA_CONCESSAO_MAX de dominio/concessao.ts do @cursos/api.
    check(
      "concessao_de_pontos_motivo_formato",
      sql`${t.motivo} = trim(${t.motivo}) and char_length(${t.motivo}) between 1 and 200`
    ),
    unique("concessao_do_aluno").on(t.userId, t.id),
    index("concessao_de_pontos_por_pessoa").on(t.userId, t.concedidaEm),
  ]
);

/** Livro-razão imutável: cada lançamento aponta para exatamente um fato do mesmo aluno. */
export const pontoLancamento = tabela(
  "ponto_lancamento",
  {
    aulaId: uuid(),
    concessaoId: uuid(),
    criadoEm: momento(),
    cursoId: uuid(),
    diaMarco: date({ mode: "string" }),
    id: uuid().primaryKey().defaultRandom(),
    liberacaoId: uuid(),
    motivo: motivoPonto().notNull(),
    pontos: integer().notNull(),
    tentativaId: uuid(),
    userId: text().notNull(),
  },
  (t) => {
    // WARNING: o check e o índice do bônus leem esta lista; coluna de referência nova entra aqui.
    const fatos = sql`num_nonnulls(${t.aulaId}, ${t.concessaoId}, ${t.cursoId}, ${t.diaMarco}, ${t.liberacaoId}, ${t.tentativaId})`;

    return [
      // WARNING: o ::text do motivo existe porque o Postgres recusa o valor novo do enum na transação do ADD VALUE (schema/acesso.ts).
      check(
        "ponto_lancamento_referencia",
        sql`${fatos} = case ${t.motivo}::text when 'bonus_funcionario' then 0 else 1 end
          and case ${t.motivo}::text
            when 'aula_assistida' then ${t.aulaId} is not null
            when 'bonus_funcionario' then true
            when 'concessao' then ${t.concessaoId} is not null
            when 'curso_concluido' then ${t.cursoId} is not null
            when 'questionario' then ${t.tentativaId} is not null
            when 'sequencia_7_dias' then ${t.diaMarco} is not null
            when 'troca' then ${t.liberacaoId} is not null
            else false
          end`
      ),
      check(
        "ponto_lancamento_sinal",
        sql`case ${t.motivo}::text
            when 'troca' then ${t.pontos} < 0
            when 'concessao' then ${t.pontos} <> 0
            else ${t.pontos} > 0
          end`
      ),
      unique("ponto_aula_uma_vez").on(t.userId, t.aulaId),
      unique("ponto_curso_uma_vez").on(t.userId, t.cursoId),
      unique("ponto_sequencia_uma_vez").on(t.userId, t.diaMarco),
      unique("ponto_troca_uma_vez").on(t.userId, t.liberacaoId),
      unique("ponto_questionario_uma_vez").on(t.userId, t.tentativaId),
      unique("ponto_concessao_uma_vez").on(t.userId, t.concessaoId),
      // WARNING: o predicado não compara o motivo (cast de enum para texto não é IMMUTABLE); sem fato, o lançamento é o bônus.
      uniqueIndex("ponto_bonus_funcionario_uma_vez")
        .on(t.userId)
        .where(sql`${fatos} = 0`),
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
        columns: [t.userId, t.concessaoId],
        foreignColumns: [concessaoDePontos.userId, concessaoDePontos.id],
        name: "ponto_concessao_fk",
      }).onDelete("restrict"),
      foreignKey({
        columns: [t.userId, t.liberacaoId],
        foreignColumns: [liberacao.userId, liberacao.id],
        name: "ponto_liberacao_fk",
      }).onDelete("restrict"),
      foreignKey({
        columns: [t.userId, t.tentativaId],
        foreignColumns: [
          questionarioTentativa.userId,
          questionarioTentativa.id,
        ],
        name: "ponto_tentativa_fk",
      }).onDelete("restrict"),
      index("ponto_lancamento_por_data").on(t.userId, t.criadoEm),
    ];
  }
);
