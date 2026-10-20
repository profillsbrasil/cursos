// A migração codigo_gerado contra a regra de codigo-do-curso.ts, no Postgres local.
// Roda a migração de verdade, numa transação desfeita no fim: os cursos plantados
// sem código e as categorias novas somem com o rollback.

import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createDb } from "@cursos/db";
import { categoria, curso } from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { inArray, isNotNull, sql, TransactionRollbackError } from "drizzle-orm";

import { codigoLivre, siglaDaCategoria } from "../dominio/codigo-do-curso";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");

const PASTA = join(import.meta.dir, "../../../db/src/migrations");
const pasta = readdirSync(PASTA).find((p) => p.endsWith("_codigo_gerado"));
const MIGRACAO = readFileSync(join(PASTA, `${pasta}/migration.sql`), "utf8");

/** Cada nome com quantos cursos sem código ele ganha. */
const CATEGORIAS: readonly [string, number][] = [
  ["Processo de envase", 2],
  ["Ação", 1],
  ["Vendas e negócios", 1],
  ["Comercial", 1],
  ["Segurança do trabalho em máquinas industriais pesadas", 2],
  // As duas viram GP: o número continua de uma para a outra.
  ["Gestão da produção", 1],
  ["Gás & Pressão", 1],
  ["Para os de com a o as os", 1],
];

describe.skipIf(URL_TESTE === null)("migração codigo_gerado", () => {
  test("dá a cada curso sem código o mesmo código que siglaDaCategoria e codigoLivre dão", async () => {
    const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
    let esperado: string[][] = [];
    let obtido: (string | null)[][] = [];
    await db
      .transaction(async (tx) => {
        await tx.execute(
          sql`alter table ${curso} alter column ${sql.identifier("codigo")} drop not null`
        );
        await tx
          .insert(categoria)
          .values(CATEGORIAS.map(([nome]) => ({ nome })))
          .onConflictDoNothing({ target: categoria.nome });
        const categorias = await tx
          .select({ id: categoria.id, nome: categoria.nome })
          .from(categoria)
          .where(
            inArray(
              categoria.nome,
              CATEGORIAS.map(([nome]) => nome)
            )
          );
        const idDe = (nome: string) =>
          categorias.find((c) => c.nome === nome)?.id ?? "";
        // O código que já existe ocupa o número: STMI começa no 002.
        await tx.insert(curso).values({
          capaAlt: "Capa de teste",
          capaAltura: 720,
          capaLargura: 1280,
          capaUrl: "/capas/teste.jpg",
          categoriaId: idDe(
            "Segurança do trabalho em máquinas industriais pesadas"
          ),
          codigo: "STMI-001",
          slug: `migracao-${S}-com-codigo`,
          titulo: "Curso com código",
        });
        const ocupados = new Set(
          (
            await tx
              .select({ codigo: curso.codigo })
              .from(curso)
              .where(isNotNull(curso.codigo))
          ).map((c) => c.codigo)
        );
        const plantados = CATEGORIAS.flatMap(([nome, n]) =>
          Array.from({ length: n }, () => nome)
        ).map((nome, i) => ({
          capaAlt: "Capa de teste",
          capaAltura: 720,
          capaLargura: 1280,
          capaUrl: "/capas/teste.jpg",
          categoriaId: idDe(nome),
          codigo: sql`null`,
          criadoEm: new Date(Date.UTC(2000, 0, 1, 0, 0, i)),
          nome,
          slug: `migracao-${S}-${i}`,
          titulo: `Curso ${i}`,
        }));
        await tx
          .insert(curso)
          .values(plantados.map(({ nome: _, ...linha }) => linha));

        esperado = plantados.map((p) => {
          const codigo = codigoLivre(siglaDaCategoria(p.nome), ocupados);
          ocupados.add(codigo);
          return [p.slug, codigo];
        });

        await tx.execute(sql.raw(MIGRACAO));
        const gravados = await tx
          .select({ codigo: curso.codigo, slug: curso.slug })
          .from(curso)
          .where(
            inArray(
              curso.slug,
              plantados.map((p) => p.slug)
            )
          )
          .orderBy(curso.criadoEm);
        obtido = gravados.map((g) => [g.slug, g.codigo]);
        tx.rollback();
      })
      .catch((e: unknown) => {
        if (!(e instanceof TransactionRollbackError)) {
          throw e;
        }
      })
      .finally(() => db.$client.end());

    expect(obtido).toEqual(esperado);
    expect(esperado.map(([, codigo]) => codigo?.split("-")[0])).toEqual([
      "PE",
      "PE",
      "ACA",
      "VN",
      "COM",
      "STMI",
      "STMI",
      "GP",
      "GP",
      "CUR",
    ]);
    const stmi = esperado.filter(([, c]) => c?.startsWith("STMI-"));
    expect(stmi.map(([, c]) => c)).toEqual(["STMI-002", "STMI-003"]);
  });
});
