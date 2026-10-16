CREATE TABLE "alternativa" (
	"certa" boolean DEFAULT false NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"pergunta_id" uuid NOT NULL,
	"posicao" smallint NOT NULL,
	"texto" text NOT NULL,
	CONSTRAINT "alternativa_posicao_unica" UNIQUE("pergunta_id","posicao"),
	CONSTRAINT "alternativa_posicao_positiva" CHECK ("posicao" >= 1),
	CONSTRAINT "alternativa_texto_formato" CHECK ("texto" = trim("texto") and char_length("texto") between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "pergunta" (
	"aula_id" uuid NOT NULL,
	"enunciado" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"posicao" smallint NOT NULL,
	CONSTRAINT "pergunta_posicao_unica" UNIQUE("aula_id","posicao"),
	CONSTRAINT "pergunta_posicao_positiva" CHECK ("posicao" >= 1),
	CONSTRAINT "pergunta_enunciado_formato" CHECK ("enunciado" = trim("enunciado") and char_length("enunciado") between 1 and 500)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "alternativa_certa_unica" ON "alternativa" ("pergunta_id") WHERE "certa";--> statement-breakpoint
ALTER TABLE "alternativa" ADD CONSTRAINT "alternativa_pergunta_id_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "pergunta"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "pergunta" ADD CONSTRAINT "pergunta_aula_id_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "aula"("id") ON DELETE CASCADE;