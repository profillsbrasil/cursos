// Liga MENSAGEM_DA_RESTRICAO e SEM_MENSAGEM_PROPRIA aos nomes reais do banco local,
// nos dois sentidos. Renomear, criar ou apagar uma restrição sem mexer em erros.ts
// deixa este teste vermelho.

import { afterAll, describe, expect, test } from "bun:test";
import { createDb } from "@cursos/db";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { sql } from "drizzle-orm";

import { MENSAGEM_DA_RESTRICAO, SEM_MENSAGEM_PROPRIA } from "./erros";

const URL_TESTE = urlDeTeste();

/** As tabelas que o admin escreve, nesta área e nos PRs seguintes. */
const TABELAS_DO_ADMIN = [
  "aula",
  "comunicado",
  "curso",
  "liberacao",
  "modulo",
  "nivel",
  "trilha",
  "trilha_curso",
];

describe.skipIf(URL_TESTE === null)("mensagens de restrição", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });

  afterAll(async () => {
    await db.$client.end();
  });

  /**
   * Restrições das tabelas do admin, mais as FKs de outras tabelas que apontam
   * para elas (disparam quando o admin apaga), mais os unique index parciais.
   */
  async function restricoesNoBanco(): Promise<Set<string>> {
    const tabelas = sql.join(
      TABELAS_DO_ADMIN.map((t) => sql`${t}`),
      sql`, `
    );
    const { rows } = await db.execute<{ nome: string }>(sql`
      select c.conname as nome
        from pg_constraint c
        join pg_namespace n on n.oid = c.connamespace
       where n.nspname = 'public'
         and c.contype in ('c', 'f', 'p', 'u', 'x')
         and (c.conrelid::regclass::text in (${tabelas})
              or c.confrelid::regclass::text in (${tabelas}))
      union
      select indexname from pg_indexes
       where schemaname = 'public'
         and tablename in (${tabelas})
         and indexdef like 'CREATE UNIQUE INDEX%'`);
    return new Set(rows.map((r) => r.nome));
  }

  test("toda chave das duas listas existe no banco", async () => {
    const nomes = await restricoesNoBanco();
    const chaves = [
      ...Object.keys(MENSAGEM_DA_RESTRICAO),
      ...SEM_MENSAGEM_PROPRIA,
    ];
    expect(chaves.filter((n) => !nomes.has(n))).toEqual([]);
  });

  test("toda restrição das tabelas do admin tem frase ou está em SEM_MENSAGEM_PROPRIA", async () => {
    const nomes = await restricoesNoBanco();
    const sem = [...nomes].filter(
      (n) =>
        !(
          Object.hasOwn(MENSAGEM_DA_RESTRICAO, n) || SEM_MENSAGEM_PROPRIA.has(n)
        )
    );
    expect(sem).toEqual([]);
  });

  test("nenhuma restrição está nas duas listas", () => {
    expect(
      Object.keys(MENSAGEM_DA_RESTRICAO).filter((n) =>
        SEM_MENSAGEM_PROPRIA.has(n)
      )
    ).toEqual([]);
  });
});
