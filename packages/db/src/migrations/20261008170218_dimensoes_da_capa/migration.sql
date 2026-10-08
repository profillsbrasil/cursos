-- Editada à mão: as colunas nascem nulas, recebem a medida e só então viram NOT NULL.
-- As medidas são as do mapa que apps/web/src/lib/capas.ts guardava; capa fora dele
-- recebe 1280x720, o mesmo valor que o app usava quando não achava a capa no mapa.
ALTER TABLE "curso" ADD COLUMN "capa_altura" smallint;--> statement-breakpoint
ALTER TABLE "curso" ADD COLUMN "capa_largura" smallint;--> statement-breakpoint
UPDATE "curso" SET "capa_largura" = 1280, "capa_altura" = 720;--> statement-breakpoint
UPDATE "curso" c SET "capa_largura" = d.largura, "capa_altura" = d.altura
FROM (VALUES
  ('/capas/autoavaliacao.jpg', 900, 437),
  ('/capas/comercial.jpg', 900, 604),
  ('/capas/gravacao.jpg', 900, 507),
  ('/capas/nova-rotina.jpg', 900, 604)
) AS d(url, largura, altura)
WHERE c."capa_url" = d.url;--> statement-breakpoint
ALTER TABLE "curso" ALTER COLUMN "capa_altura" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "curso" ALTER COLUMN "capa_largura" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "curso" ADD CONSTRAINT "curso_capa_dimensoes_positivas" CHECK ("capa_largura" > 0 and "capa_altura" > 0);
