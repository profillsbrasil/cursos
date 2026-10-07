CREATE TYPE "curso_status" AS ENUM('em_producao', 'publicado');--> statement-breakpoint
CREATE TYPE "motivo_ponto" AS ENUM('aula_assistida', 'curso_concluido', 'trilha_concluida', 'sequencia_7_dias');--> statement-breakpoint
CREATE TABLE "liberacao" (
	"curso_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"liberada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"liberada_por" text NOT NULL,
	"revogada_em" timestamp with time zone,
	"revogada_por" text,
	"trilha_id" uuid,
	"user_id" text NOT NULL,
	CONSTRAINT "liberacao_user_id_clerk" CHECK ("user_id" ~ '^user_[A-Za-z0-9]+$'),
	CONSTRAINT "liberacao_alvo_unico" CHECK (num_nonnulls("trilha_id", "curso_id") = 1),
	CONSTRAINT "liberacao_revogacao_coerente" CHECK (("revogada_em" is null) = ("revogada_por" is null)
          and ("revogada_em" is null or "revogada_em" >= "liberada_em"))
);
--> statement-breakpoint
CREATE TABLE "aula" (
	"duracao_seg" integer NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"modulo_id" uuid NOT NULL,
	"posicao" smallint NOT NULL,
	"titulo" text NOT NULL,
	CONSTRAINT "aula_posicao_unica" UNIQUE("modulo_id","posicao"),
	CONSTRAINT "aula_posicao_positiva" CHECK ("posicao" >= 1),
	CONSTRAINT "aula_duracao_positiva" CHECK ("duracao_seg" > 0)
);
--> statement-breakpoint
CREATE TABLE "curso" (
	"capa_alt" text NOT NULL,
	"capa_url" text NOT NULL,
	"codigo" text UNIQUE,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"destaque" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL UNIQUE,
	"status" "curso_status" DEFAULT 'em_producao'::"curso_status" NOT NULL,
	"tema" text NOT NULL,
	"titulo" text NOT NULL,
	CONSTRAINT "curso_slug_formato" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "curso_capa_alt_preenchido" CHECK (length(trim("capa_alt")) > 0)
);
--> statement-breakpoint
CREATE TABLE "modulo" (
	"curso_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"nivel_ordem" smallint,
	"numero" smallint NOT NULL,
	"titulo" text NOT NULL,
	CONSTRAINT "modulo_numero_unico" UNIQUE("curso_id","numero"),
	CONSTRAINT "modulo_numero_nao_negativo" CHECK ("numero" >= 0)
);
--> statement-breakpoint
CREATE TABLE "nivel" (
	"curso_id" uuid,
	"nome" text NOT NULL,
	"ordem" smallint,
	CONSTRAINT "nivel_pkey" PRIMARY KEY("curso_id","ordem"),
	CONSTRAINT "nivel_ordem_positiva" CHECK ("ordem" >= 1)
);
--> statement-breakpoint
CREATE TABLE "trilha" (
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"descricao" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL UNIQUE,
	"titulo" text NOT NULL,
	CONSTRAINT "trilha_slug_formato" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "trilha_curso" (
	"curso_id" uuid PRIMARY KEY,
	"posicao" smallint NOT NULL,
	"trilha_id" uuid NOT NULL,
	CONSTRAINT "trilha_curso_posicao_unica" UNIQUE("trilha_id","posicao"),
	CONSTRAINT "trilha_curso_posicao_positiva" CHECK ("posicao" >= 1)
);
--> statement-breakpoint
CREATE TABLE "comunicado" (
	"curso_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"publicado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"publicado_por" text NOT NULL,
	"texto" text NOT NULL,
	"titulo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aula_assistida" (
	"assistida_em" timestamp with time zone DEFAULT now() NOT NULL,
	"aula_id" uuid,
	"dia" date GENERATED ALWAYS AS (((assistida_em at time zone 'America/Sao_Paulo')::date)) STORED NOT NULL,
	"user_id" text,
	CONSTRAINT "aula_assistida_pkey" PRIMARY KEY("user_id","aula_id")
);
--> statement-breakpoint
CREATE TABLE "certificado" (
	"codigo" text NOT NULL UNIQUE,
	"curso_id" uuid NOT NULL,
	"emitido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	CONSTRAINT "certificado_um_por_curso" UNIQUE("user_id","curso_id")
);
--> statement-breakpoint
CREATE TABLE "posicao_aula" (
	"atualizada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"aula_id" uuid,
	"posicao_seg" integer NOT NULL,
	"user_id" text,
	CONSTRAINT "posicao_aula_pkey" PRIMARY KEY("user_id","aula_id"),
	CONSTRAINT "posicao_aula_nao_negativa" CHECK ("posicao_seg" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ponto_lancamento" (
	"aula_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"curso_id" uuid,
	"dia_marco" date,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"motivo" "motivo_ponto" NOT NULL,
	"pontos" integer NOT NULL,
	"trilha_id" uuid,
	"user_id" text NOT NULL,
	CONSTRAINT "ponto_aula_uma_vez" UNIQUE("user_id","aula_id"),
	CONSTRAINT "ponto_curso_uma_vez" UNIQUE("user_id","curso_id"),
	CONSTRAINT "ponto_trilha_uma_vez" UNIQUE("user_id","trilha_id"),
	CONSTRAINT "ponto_sequencia_uma_vez" UNIQUE("user_id","dia_marco"),
	CONSTRAINT "ponto_lancamento_referencia" CHECK (num_nonnulls("aula_id", "curso_id", "trilha_id", "dia_marco") = 1
          and case "motivo"
            when 'aula_assistida' then "aula_id" is not null
            when 'curso_concluido' then "curso_id" is not null
            when 'trilha_concluida' then "trilha_id" is not null
            when 'sequencia_7_dias' then "dia_marco" is not null
          end),
	CONSTRAINT "ponto_lancamento_positivo" CHECK ("pontos" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "liberacao_trilha_ativa_unica" ON "liberacao" ("user_id","trilha_id") WHERE "revogada_em" is null and "trilha_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "liberacao_curso_ativa_unica" ON "liberacao" ("user_id","curso_id") WHERE "revogada_em" is null and "curso_id" is not null;--> statement-breakpoint
CREATE INDEX "liberacao_ativa_por_pessoa" ON "liberacao" ("user_id") WHERE "revogada_em" is null;--> statement-breakpoint
CREATE INDEX "comunicado_recentes" ON "comunicado" ("publicado_em" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "aula_assistida_por_dia" ON "aula_assistida" ("user_id","dia");--> statement-breakpoint
CREATE INDEX "ponto_lancamento_por_data" ON "ponto_lancamento" ("user_id","criado_em");--> statement-breakpoint
ALTER TABLE "liberacao" ADD CONSTRAINT "liberacao_curso_id_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "liberacao" ADD CONSTRAINT "liberacao_trilha_id_trilha_id_fkey" FOREIGN KEY ("trilha_id") REFERENCES "trilha"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "aula" ADD CONSTRAINT "aula_modulo_id_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulo"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "modulo" ADD CONSTRAINT "modulo_curso_id_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "modulo" ADD CONSTRAINT "modulo_nivel_do_mesmo_curso" FOREIGN KEY ("curso_id","nivel_ordem") REFERENCES "nivel"("curso_id","ordem") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "nivel" ADD CONSTRAINT "nivel_curso_id_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trilha_curso" ADD CONSTRAINT "trilha_curso_curso_id_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "trilha_curso" ADD CONSTRAINT "trilha_curso_trilha_id_trilha_id_fkey" FOREIGN KEY ("trilha_id") REFERENCES "trilha"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_curso_id_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "aula_assistida" ADD CONSTRAINT "aula_assistida_aula_id_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "aula"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "certificado" ADD CONSTRAINT "certificado_curso_id_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "posicao_aula" ADD CONSTRAINT "posicao_aula_aula_id_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "aula"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD CONSTRAINT "ponto_lancamento_trilha_id_trilha_id_fkey" FOREIGN KEY ("trilha_id") REFERENCES "trilha"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD CONSTRAINT "ponto_aula_assistida_fk" FOREIGN KEY ("user_id","aula_id") REFERENCES "aula_assistida"("user_id","aula_id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ponto_lancamento" ADD CONSTRAINT "ponto_certificado_fk" FOREIGN KEY ("user_id","curso_id") REFERENCES "certificado"("user_id","curso_id") ON DELETE RESTRICT;