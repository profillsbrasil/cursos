CREATE TABLE "convite" (
	"aceito_em" timestamp with time zone,
	"aceito_por" text,
	"cancelado_em" timestamp with time zone,
	"cancelado_por" text,
	"clerk_convite_id" text,
	"como_admin" boolean NOT NULL,
	"convidado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"convidado_por" text NOT NULL,
	"email" text NOT NULL,
	"enviado_em" timestamp with time zone,
	"expira_em" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"papel_aplicado_em" timestamp with time zone,
	"perfil" "perfil" NOT NULL,
	CONSTRAINT "convite_email_formato" CHECK ("email" = lower(btrim("email"))
          and char_length("email") <= 254
          and "email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
	CONSTRAINT "convite_convidado_por_clerk" CHECK ("convidado_por" ~ '^user_[A-Za-z0-9]+$'),
	CONSTRAINT "convite_envio_coerente" CHECK (("enviado_em" is null) = ("clerk_convite_id" is null)),
	CONSTRAINT "convite_aceite_coerente" CHECK (("aceito_em" is null) = ("aceito_por" is null)
          and ("aceito_por" is null or "aceito_por" ~ '^user_[A-Za-z0-9]+$')),
	CONSTRAINT "convite_cancelamento_coerente" CHECK (("cancelado_em" is null) = ("cancelado_por" is null)),
	CONSTRAINT "convite_um_fim_so" CHECK ("aceito_em" is null or "cancelado_em" is null),
	CONSTRAINT "convite_papel_aplicado_coerente" CHECK ("papel_aplicado_em" is null or ("como_admin" and "aceito_em" is not null))
);
--> statement-breakpoint
CREATE TABLE "convite_curso" (
	"convite_id" uuid,
	"curso_id" uuid,
	CONSTRAINT "convite_curso_pkey" PRIMARY KEY("convite_id","curso_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "convite_vivo_por_email" ON "convite" ("email") WHERE "aceito_em" is null and "cancelado_em" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "convite_aceito_por_unico" ON "convite" ("aceito_por") WHERE "aceito_por" is not null;--> statement-breakpoint
ALTER TABLE "convite_curso" ADD CONSTRAINT "convite_curso_convite_id_convite_id_fkey" FOREIGN KEY ("convite_id") REFERENCES "convite"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "convite_curso" ADD CONSTRAINT "convite_curso_curso_id_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE CASCADE;