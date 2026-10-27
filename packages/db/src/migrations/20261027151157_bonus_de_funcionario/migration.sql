-- ADD VALUE na mesma transação do índice e do check: o check compara o motivo como
-- texto (::text) e o índice não lê o motivo, então o Postgres não recusa o valor novo
-- antes do commit (ver schema/pontos.ts).
ALTER TYPE "motivo_ponto" ADD VALUE 'bonus_funcionario' BEFORE 'concessao';--> statement-breakpoint
CREATE UNIQUE INDEX "ponto_bonus_funcionario_uma_vez" ON "ponto_lancamento" ("user_id") WHERE num_nonnulls("aula_id", "concessao_id", "curso_id", "dia_marco", "liberacao_id", "tentativa_id") = 0;--> statement-breakpoint
ALTER TABLE "ponto_lancamento" DROP CONSTRAINT "ponto_lancamento_referencia", ADD CONSTRAINT "ponto_lancamento_referencia" CHECK (num_nonnulls("aula_id", "concessao_id", "curso_id", "dia_marco", "liberacao_id", "tentativa_id") = case "motivo"::text when 'bonus_funcionario' then 0 else 1 end
          and case "motivo"::text
            when 'aula_assistida' then "aula_id" is not null
            when 'bonus_funcionario' then true
            when 'concessao' then "concessao_id" is not null
            when 'curso_concluido' then "curso_id" is not null
            when 'questionario' then "tentativa_id" is not null
            when 'sequencia_7_dias' then "dia_marco" is not null
            when 'troca' then "liberacao_id" is not null
            else false
          end);