CREATE TYPE "perfil" AS ENUM('funcionario', 'cliente', 'publico');--> statement-breakpoint
CREATE TABLE "liberacao_do_perfil" (
	"curso_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"liberada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"liberada_por" text NOT NULL,
	"perfil" "perfil" NOT NULL,
	"revogada_em" timestamp with time zone,
	"revogada_por" text,
	CONSTRAINT "liberacao_do_perfil_revogacao_coerente" CHECK (("revogada_em" is null) = ("revogada_por" is null)
          and ("revogada_em" is null or "revogada_em" >= "liberada_em"))
);
--> statement-breakpoint
CREATE TABLE "perfil_da_pessoa" (
	"definido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"definido_por" text,
	"perfil" "perfil" NOT NULL,
	"user_id" text PRIMARY KEY,
	CONSTRAINT "perfil_da_pessoa_user_id_clerk" CHECK ("user_id" ~ '^user_[A-Za-z0-9]+$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "liberacao_do_perfil_ativa_unica" ON "liberacao_do_perfil" ("perfil","curso_id") WHERE "revogada_em" is null;--> statement-breakpoint
ALTER TABLE "liberacao_do_perfil" ADD CONSTRAINT "liberacao_do_perfil_curso_id_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE RESTRICT;