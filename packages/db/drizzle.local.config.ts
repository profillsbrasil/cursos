import { defineConfig } from "drizzle-kit";

import { garantirBancoLocal, URL_LOCAL_PADRAO } from "./src/seed/guarda-local";

// Só o Postgres local. Não importa varlock/auto-load, então nunca lê o DATABASE_URL do .env.
// LOCAL_DATABASE_URL aponta outro Postgres local (outro worktree, outra porta); host remoto é recusado.
const url = process.env.LOCAL_DATABASE_URL ?? URL_LOCAL_PADRAO;
garantirBancoLocal(url, null);

export default defineConfig({
  dbCredentials: { url },
  dialect: "postgresql",
  out: "./src/migrations",
  schema: "./src/schema/index.ts",
  schemaFilter: ["public"],
});
