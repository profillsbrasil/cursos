-- O valor novo do enum entra recriando o tipo, como em catalogo_sem_trilha: ADD VALUE
-- na mesma transação do check que o lê dá "unsafe use of new value".
ALTER TABLE "ponto_lancamento" DROP CONSTRAINT "ponto_lancamento_referencia";--> statement-breakpoint
ALTER TABLE "ponto_lancamento" DROP CONSTRAINT "ponto_lancamento_sinal";--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ALTER COLUMN "motivo" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "motivo_ponto";--> statement-breakpoint
CREATE TYPE "motivo_ponto" AS ENUM('aula_assistida', 'curso_concluido', 'questionario', 'sequencia_7_dias', 'troca');--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ALTER COLUMN "motivo" SET DATA TYPE "motivo_ponto" USING "motivo"::"motivo_ponto";--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD CONSTRAINT "ponto_lancamento_sinal" CHECK (case "motivo" when 'troca' then "pontos" < 0 else "pontos" > 0 end);--> statement-breakpoint
CREATE TABLE "questionario_resposta" (
	"alternativa_id" uuid NOT NULL,
	"certa" boolean NOT NULL,
	"pergunta_id" uuid NOT NULL,
	"tentativa_id" uuid NOT NULL,
	CONSTRAINT "questionario_resposta_pkey" PRIMARY KEY("tentativa_id","pergunta_id")
);
--> statement-breakpoint
CREATE TABLE "questionario_tentativa" (
	"acertos" smallint NOT NULL,
	"aprovada" boolean NOT NULL,
	"aula_id" uuid NOT NULL,
	"enviada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY,
	"numero" smallint NOT NULL,
	"total" smallint NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "tentativa_numero_unico" UNIQUE("user_id","aula_id","numero"),
	CONSTRAINT "tentativa_do_aluno" UNIQUE("user_id","id"),
	CONSTRAINT "tentativa_user_id_clerk" CHECK ("user_id" ~ '^user_[A-Za-z0-9]+$'),
	CONSTRAINT "tentativa_numero_positivo" CHECK ("numero" >= 1),
	CONSTRAINT "tentativa_acertos_no_total" CHECK ("total" >= 1 and "acertos" between 0 and "total")
);
--> statement-breakpoint
-- O certificado que já existe ganha a soma dos vídeos do curso como ele está hoje.
ALTER TABLE "certificado" ADD COLUMN "segundos_de_video" integer;--> statement-breakpoint
UPDATE "certificado" SET "segundos_de_video" = (
  select coalesce(sum(a.duracao_seg), 0) from aula a
    join modulo m on m.id = a.modulo_id
   where m.curso_id = certificado.curso_id);--> statement-breakpoint
ALTER TABLE "certificado" ALTER COLUMN "segundos_de_video" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD COLUMN "tentativa_id" uuid;--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD CONSTRAINT "ponto_questionario_uma_vez" UNIQUE("user_id","tentativa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tentativa_aprovada_unica" ON "questionario_tentativa" ("user_id","aula_id") WHERE "aprovada";--> statement-breakpoint
ALTER TABLE "questionario_resposta" ADD CONSTRAINT "questionario_resposta_alternativa_id_alternativa_id_fkey" FOREIGN KEY ("alternativa_id") REFERENCES "alternativa"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "questionario_resposta" ADD CONSTRAINT "questionario_resposta_pergunta_id_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "pergunta"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "questionario_resposta" ADD CONSTRAINT "resposta_da_tentativa" FOREIGN KEY ("tentativa_id") REFERENCES "questionario_tentativa"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "questionario_tentativa" ADD CONSTRAINT "questionario_tentativa_aula_id_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "aula"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD CONSTRAINT "ponto_tentativa_fk" FOREIGN KEY ("user_id","tentativa_id") REFERENCES "questionario_tentativa"("user_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "certificado" ADD CONSTRAINT "certificado_segundos_nao_negativos" CHECK ("segundos_de_video" >= 0);--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD CONSTRAINT "ponto_lancamento_referencia" CHECK (num_nonnulls("aula_id", "curso_id", "dia_marco", "liberacao_id", "tentativa_id") = 1
          and case "motivo"
            when 'aula_assistida' then "aula_id" is not null
            when 'curso_concluido' then "curso_id" is not null
            when 'questionario' then "tentativa_id" is not null
            when 'sequencia_7_dias' then "dia_marco" is not null
            when 'troca' then "liberacao_id" is not null
            else false
          end);