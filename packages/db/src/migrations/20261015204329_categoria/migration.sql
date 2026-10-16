CREATE TABLE "categoria" (
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"nome" text NOT NULL CONSTRAINT "categoria_nome_unico" UNIQUE,
	CONSTRAINT "categoria_nome_formato" CHECK ("nome" = trim("nome") and char_length("nome") between 1 and 80)
);
--> statement-breakpoint
-- Uma categoria por texto distinto de curso.categoria, no formato do check. O texto
-- vazio, que o editor nunca gravou, vira "Sem categoria".
INSERT INTO "categoria" ("nome")
SELECT DISTINCT coalesce(nullif(trim(left(trim("categoria"), 80)), ''), 'Sem categoria')
  FROM "curso";--> statement-breakpoint
ALTER TABLE "curso" ADD COLUMN "categoria_id" uuid;--> statement-breakpoint
UPDATE "curso" SET "categoria_id" = "categoria"."id"
  FROM "categoria"
 WHERE "categoria"."nome" = coalesce(nullif(trim(left(trim("curso"."categoria"), 80)), ''), 'Sem categoria');--> statement-breakpoint
ALTER TABLE "curso" ALTER COLUMN "categoria_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "curso" ADD CONSTRAINT "curso_categoria_id_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "curso" DROP COLUMN "categoria";
