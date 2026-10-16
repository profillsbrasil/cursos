ALTER TABLE "curso" RENAME COLUMN "tema" TO "categoria";--> statement-breakpoint
-- O check curso_topicos_validos chama esta função: um check não aceita subconsulta.
-- Os tetos (10 tópicos de até 120 caracteres) repetem LIMITES e CARACTERES de
-- packages/api/src/dominio/edicao-do-curso.ts.
CREATE FUNCTION "public"."topicos_validos"(topicos text[]) RETURNS boolean
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  SET search_path = ''
  RETURN cardinality(topicos) <= 10
    AND NOT EXISTS (
      SELECT 1 FROM unnest(topicos) AS t(topico)
       WHERE topico IS NULL
          OR length(trim(topico)) = 0
          OR char_length(topico) > 120
    );--> statement-breakpoint
ALTER TABLE "aula" ADD COLUMN "descricao" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "curso" ADD COLUMN "descricao" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "curso" ADD COLUMN "topicos" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "aula" ADD CONSTRAINT "aula_descricao_tamanho" CHECK (char_length("descricao") <= 2000);--> statement-breakpoint
ALTER TABLE "curso" ADD CONSTRAINT "curso_descricao_tamanho" CHECK (char_length("descricao") <= 2000);--> statement-breakpoint
ALTER TABLE "curso" ADD CONSTRAINT "curso_topicos_validos" CHECK (topicos_validos("topicos"));
