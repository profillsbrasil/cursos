import { defineConfig } from "drizzle-kit";

// Só o Supabase local. Não importa varlock/auto-load, então nunca lê o DATABASE_URL do .env (cloud).
export const URL_LOCAL =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export default defineConfig({
  dbCredentials: { url: URL_LOCAL },
  dialect: "postgresql",
  out: "./src/migrations",
  schema: "./src/schema/index.ts",
  schemaFilter: ["public"],
});
