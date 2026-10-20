CREATE TYPE "material_tipo" AS ENUM('pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'png', 'jpg', 'webp', 'zip');--> statement-breakpoint
CREATE TABLE "material" (
	"bytes" integer NOT NULL,
	"chave" text NOT NULL,
	"curso_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"nome_do_arquivo" text NOT NULL,
	"posicao" smallint NOT NULL,
	"tipo" "material_tipo" NOT NULL,
	"titulo" text NOT NULL,
	CONSTRAINT "material_posicao_unica" UNIQUE("curso_id","posicao"),
	CONSTRAINT "material_posicao_positiva" CHECK ("posicao" >= 1),
	CONSTRAINT "material_titulo_formato" CHECK ("titulo" = trim("titulo") and char_length("titulo") between 1 and 120),
	CONSTRAINT "material_nome_do_arquivo_tamanho" CHECK (char_length("nome_do_arquivo") between 1 and 200),
	CONSTRAINT "material_bytes_limite" CHECK ("bytes" between 1 and 52428800),
	CONSTRAINT "material_chave_formato" CHECK ("chave" ~ ('^[0-9a-f]{64}\.' || "tipo"::text || '$'))
);
--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_curso_id_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE CASCADE;