ALTER TYPE "motivo_ponto" ADD VALUE 'troca';--> statement-breakpoint
ALTER TABLE "ponto_lancamento" DROP CONSTRAINT "ponto_lancamento_positivo";--> statement-breakpoint
ALTER TABLE "curso" ADD COLUMN "preco_troca" integer;--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD COLUMN "liberacao_id" uuid;--> statement-breakpoint
ALTER TABLE "liberacao" ADD CONSTRAINT "liberacao_do_aluno" UNIQUE("user_id","id");--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD CONSTRAINT "ponto_troca_uma_vez" UNIQUE("user_id","liberacao_id");--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD CONSTRAINT "ponto_liberacao_fk" FOREIGN KEY ("user_id","liberacao_id") REFERENCES "liberacao"("user_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "curso" ADD CONSTRAINT "curso_preco_troca_positivo" CHECK ("preco_troca" is null or "preco_troca" > 0);--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD CONSTRAINT "ponto_lancamento_sinal" CHECK (case "motivo"::text when 'troca' then "pontos" < 0 else "pontos" > 0 end);--> statement-breakpoint
ALTER TABLE "ponto_lancamento" DROP CONSTRAINT "ponto_lancamento_referencia", ADD CONSTRAINT "ponto_lancamento_referencia" CHECK (num_nonnulls("aula_id", "curso_id", "trilha_id", "dia_marco", "liberacao_id") = 1
          and case "motivo"::text
            when 'aula_assistida' then "aula_id" is not null
            when 'curso_concluido' then "curso_id" is not null
            when 'trilha_concluida' then "trilha_id" is not null
            when 'sequencia_7_dias' then "dia_marco" is not null
            when 'troca' then "liberacao_id" is not null
            else false
          end);