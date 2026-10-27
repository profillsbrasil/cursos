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
    concedidaPor: text().notNull(), // userId do admin
    id: uuid().primaryKey().defaultRandom(),
    motivo: text().notNull(),
    pontos: integer().notNull(),
    userId: text().notNull(), // userId do Clerk
  },
  (t) => [
    check(
      "concessao_de_pontos_user_id_clerk",
      sql`${t.userId} ~ '^user_[A-Za-z0-9]+$'`
    ),
    check("concessao_de_pontos_nao_zero", sql`${t.pontos} <> 0`),
    // O teto repete MOTIVO_DA_CONCESSAO_MAX de dominio/concessao.ts do @cursos/api.
    check(
      "concessao_de_pontos_motivo_formato",
      sql`${t.motivo} = trim(${t.motivo}) and char_length(${t.motivo}) between 1 and 200`
    ),
    unique("concessao_do_aluno").on(t.userId, t.id), // alvo da FK composta do lançamento
    index("concessao_de_pontos_por_pessoa").on(t.userId, t.concedidaEm),
  ]
);

// Livro-razão imutável. Cada lançamento aponta para exatamente um fato do mesmo aluno.
export const pontoLancamento = tabela(
  "ponto_lancamento",
  {
    aulaId: uuid(),
    concessaoId: uuid(),
    criadoEm: momento(),
    cursoId: uuid(),
    diaMarco: date({ mode: "string" }), // dia útil que fechou o bloco de 7
    id: uuid().primaryKey().defaultRandom(),
    liberacaoId: uuid(),
    motivo: motivoPonto().notNull(),
    pontos: integer().notNull(),
    tentativaId: uuid(),
    userId: text().notNull(),
  },
  (t) => {
    // Quantos fatos o lançamento referencia. O check e o índice do bônus leem a
    // mesma lista: coluna de referência nova entra aqui, nos dois de uma vez.
    const fatos = sql`num_nonnulls(${t.aulaId}, ${t.concessaoId}, ${t.cursoId}, ${t.diaMarco}, ${t.liberacaoId}, ${t.tentativaId})`;
    return [
      // ::text porque as migrações concessao_de_pontos e bonus_de_funcionario fazem
      // ALTER TYPE ... ADD VALUE, e o Postgres recusa o valor novo do enum na mesma
      // transação (ver schema/acesso.ts). O bônus de funcionário é o único lançamento
      // sem fato: ele é um por pessoa, e quem segura isso é ponto_bonus_funcionario_uma_vez.
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
      // NULL é distinto de NULL: cada unique só morde o motivo que preenche a coluna
      unique("ponto_aula_uma_vez").on(t.userId, t.aulaId),
      unique("ponto_curso_uma_vez").on(t.userId, t.cursoId),
      unique("ponto_sequencia_uma_vez").on(t.userId, t.diaMarco),
      unique("ponto_troca_uma_vez").on(t.userId, t.liberacaoId),
      unique("ponto_questionario_uma_vez").on(t.userId, t.tentativaId),
      unique("ponto_concessao_uma_vez").on(t.userId, t.concessaoId),
      // Uma vez por pessoa, para sempre: sair de Funcionário e voltar não dá outro.
      // O predicado não compara o motivo: o cast do enum para texto não é IMMUTABLE,
      // e o valor novo não vale na transação do ADD VALUE. Pelo check de referência,
      // o lançamento sem fato é o bônus.
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
