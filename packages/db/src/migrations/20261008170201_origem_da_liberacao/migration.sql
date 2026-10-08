-- Editada à mão: a coluna nasce nula, é preenchida e só então vira NOT NULL.
-- É troca a liberação que um lançamento de troca paga (ponto_liberacao_fk); o resto,
-- inclusive a do admin que liberou para si mesmo, vira admin.
CREATE TYPE "liberacao_origem" AS ENUM('admin', 'troca');--> statement-breakpoint
ALTER TABLE "liberacao" ADD COLUMN "origem" "liberacao_origem";--> statement-breakpoint
UPDATE "liberacao" l SET "origem" = (CASE WHEN EXISTS (
  SELECT 1 FROM "ponto_lancamento" p
  WHERE p."user_id" = l."user_id"
    AND p."liberacao_id" = l."id"
    AND p."motivo"::text = 'troca'
) THEN 'troca' ELSE 'admin' END)::"liberacao_origem";--> statement-breakpoint
ALTER TABLE "liberacao" ALTER COLUMN "origem" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "liberacao" ADD CONSTRAINT "liberacao_troca_pelo_aluno" CHECK ("origem"::text <> 'troca'
          or ("liberada_por" = "user_id" and "curso_id" is not null));--> statement-breakpoint
ALTER TABLE "liberacao" DROP CONSTRAINT "liberacao_troca_nao_revoga", ADD CONSTRAINT "liberacao_troca_nao_revoga" CHECK ("revogada_em" is null or "origem"::text <> 'troca');
