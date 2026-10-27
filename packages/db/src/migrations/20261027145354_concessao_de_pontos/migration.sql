-- ADD VALUE na mesma transação dos checks: eles comparam o motivo como texto (::text),
-- então o Postgres não recusa o valor novo antes do commit (ver schema/acesso.ts).
ALTER TYPE "motivo_ponto" ADD VALUE 'concessao' BEFORE 'curso_concluido';--> statement-breakpoint
CREATE TABLE "concessao_de_pontos" (
	"concedida_em" timestamp with time zone DEFAULT now() NOT NULL,
	"concedida_por" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"motivo" text NOT NULL,
	"pontos" integer NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "concessao_do_aluno" UNIQUE("user_id","id"),
	CONSTRAINT "concessao_de_pontos_user_id_clerk" CHECK ("user_id" ~ '^user_[A-Za-z0-9]+$'),
	CONSTRAINT "concessao_de_pontos_nao_zero" CHECK ("pontos" <> 0),
	CONSTRAINT "concessao_de_pontos_motivo_formato" CHECK ("motivo" = trim("motivo") and char_length("motivo") between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD COLUMN "concessao_id" uuid;--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD CONSTRAINT "ponto_concessao_uma_vez" UNIQUE("user_id","concessao_id");--> statement-breakpoint
CREATE INDEX "concessao_de_pontos_por_pessoa" ON "concessao_de_pontos" ("user_id","concedida_em");--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD CONSTRAINT "ponto_concessao_fk" FOREIGN KEY ("user_id","concessao_id") REFERENCES "concessao_de_pontos"("user_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ponto_lancamento" DROP CONSTRAINT "ponto_lancamento_referencia", ADD CONSTRAINT "ponto_lancamento_referencia" CHECK (num_nonnulls("aula_id", "concessao_id", "curso_id", "dia_marco", "liberacao_id", "tentativa_id") = 1
          and case "motivo"::text
            when 'aula_assistida' then "aula_id" is not null
            when 'concessao' then "concessao_id" is not null
            when 'curso_concluido' then "curso_id" is not null
            when 'questionario' then "tentativa_id" is not null
            when 'sequencia_7_dias' then "dia_marco" is not null
            when 'troca' then "liberacao_id" is not null
            else false
          end);--> statement-breakpoint
ALTER TABLE "ponto_lancamento" DROP CONSTRAINT "ponto_lancamento_sinal", ADD CONSTRAINT "ponto_lancamento_sinal" CHECK (case "motivo"::text
            when 'troca' then "pontos" < 0
            when 'concessao' then "pontos" <> 0
            else "pontos" > 0
          end);