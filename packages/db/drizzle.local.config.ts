import { defineConfig } from "drizzle-kit";

import { garantirBancoLocal, URL_LOCAL_PADRAO } from "./src/seed/guarda-local";

// WARNING: não importe varlock/auto-load aqui: o config só pode usar o Postgres local, nunca o DATABASE_URL do .env.
const url = process.env.LOCAL_DATABASE_URL ?? URL_LOCAL_PADRAO;

garantirBancoLocal(url, null);

export default defineConfig({
  dbCredentials: { url },
  dialect: "postgresql",
  out: "./src/migrations",
  schema: "./src/schema/index.ts",
  schemaFilter: ["public"],
});
