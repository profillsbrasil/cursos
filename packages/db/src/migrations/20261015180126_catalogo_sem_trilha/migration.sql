-- O catálogo passa a ter só curso (docs/adr/0001-catalogo-so-de-cursos.md). Os dados de
-- trilha são de teste: os fatos que apontam para ela saem antes das colunas e tabelas.
DELETE FROM "ponto_lancamento" WHERE "trilha_id" IS NOT NULL;--> statement-breakpoint
DELETE FROM "liberacao" WHERE "trilha_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "liberacao" DROP CONSTRAINT "liberacao_trilha_id_trilha_id_fkey";--> statement-breakpoint
ALTER TABLE "trilha_curso" DROP CONSTRAINT "trilha_curso_trilha_id_trilha_id_fkey";--> statement-breakpoint
ALTER TABLE "ponto_lancamento" DROP CONSTRAINT "ponto_lancamento_trilha_id_trilha_id_fkey";--> statement-breakpoint
DROP TABLE "trilha";--> statement-breakpoint
DROP TABLE "trilha_curso";--> statement-breakpoint
ALTER TABLE "ponto_lancamento" DROP CONSTRAINT "ponto_trilha_uma_vez";--> statement-breakpoint
ALTER TABLE "liberacao" DROP CONSTRAINT "liberacao_alvo_unico";--> statement-breakpoint
DROP INDEX "liberacao_trilha_ativa_unica";--> statement-breakpoint
DROP INDEX "liberacao_por_trilha";--> statement-breakpoint
DROP INDEX "ponto_lancamento_por_trilha";--> statement-breakpoint
-- Os dois checks leem motivo: saem antes de o tipo ser recriado e voltam depois.
ALTER TABLE "ponto_lancamento" DROP CONSTRAINT "ponto_lancamento_referencia";--> statement-breakpoint
ALTER TABLE "ponto_lancamento" DROP CONSTRAINT "ponto_lancamento_sinal";--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ALTER COLUMN "motivo" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "motivo_ponto";--> statement-breakpoint
CREATE TYPE "motivo_ponto" AS ENUM('aula_assistida', 'curso_concluido', 'sequencia_7_dias', 'troca');--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ALTER COLUMN "motivo" SET DATA TYPE "motivo_ponto" USING "motivo"::"motivo_ponto";--> statement-breakpoint
ALTER TABLE "liberacao" DROP COLUMN "trilha_id";--> statement-breakpoint
ALTER TABLE "ponto_lancamento" DROP COLUMN "trilha_id";--> statement-breakpoint
ALTER TABLE "liberacao" ALTER COLUMN "curso_id" SET NOT NULL;--> statement-breakpoint
DROP INDEX "liberacao_curso_ativa_unica";--> statement-breakpoint
CREATE UNIQUE INDEX "liberacao_curso_ativa_unica" ON "liberacao" ("user_id","curso_id") WHERE "revogada_em" is null;--> statement-breakpoint
ALTER TABLE "liberacao" DROP CONSTRAINT "liberacao_troca_pelo_aluno", ADD CONSTRAINT "liberacao_troca_pelo_aluno" CHECK ("origem"::text <> 'troca' or "liberada_por" = "user_id");--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD CONSTRAINT "ponto_lancamento_sinal" CHECK (case "motivo" when 'troca' then "pontos" < 0 else "pontos" > 0 end);--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD CONSTRAINT "ponto_lancamento_referencia" CHECK (num_nonnulls("aula_id", "curso_id", "dia_marco", "liberacao_id") = 1
          and case "motivo"
            when 'aula_assistida' then "aula_id" is not null
            when 'curso_concluido' then "curso_id" is not null
            when 'sequencia_7_dias' then "dia_marco" is not null
            when 'troca' then "liberacao_id" is not null
            else false
          end);
