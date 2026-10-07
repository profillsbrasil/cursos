CREATE TYPE "video_provedor" AS ENUM('youtube');--> statement-breakpoint
CREATE TABLE "cota_video" (
	"atualizada_em" timestamp with time zone NOT NULL,
	"segundos" double precision NOT NULL,
	"user_id" text PRIMARY KEY,
	CONSTRAINT "cota_video_nao_negativa" CHECK ("segundos" >= 0),
	CONSTRAINT "cota_video_user_id_clerk" CHECK ("user_id" ~ '^user_[A-Za-z0-9]+$')
);
--> statement-breakpoint
ALTER TABLE "aula" ADD COLUMN "video_id" text;--> statement-breakpoint
ALTER TABLE "aula" ADD COLUMN "video_provedor" "video_provedor";--> statement-breakpoint
ALTER TABLE "posicao_aula" ADD COLUMN "trechos_vistos" int4multirange DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "aula" ADD CONSTRAINT "aula_video_completo" CHECK (("video_provedor" is null) = ("video_id" is null));--> statement-breakpoint
ALTER TABLE "aula" ADD CONSTRAINT "aula_video_formato" CHECK ("video_provedor" is null or case "video_provedor"
            when 'youtube' then "video_id" ~ '^[A-Za-z0-9_-]{11}$'
            else false
          end);--> statement-breakpoint
ALTER TABLE "posicao_aula" ADD CONSTRAINT "posicao_aula_trechos_nao_negativos" CHECK (lower("trechos_vistos") >= 0);