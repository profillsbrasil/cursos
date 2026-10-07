import type { Logger } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import type { DatabaseConfig } from "./config";
import { relations } from "./relations";

export function createDb(env: DatabaseConfig, opcoes?: { logger?: Logger }) {
  return drizzle(env.DATABASE_URL, { logger: opcoes?.logger, relations });
}

export type Database = ReturnType<typeof createDb>;
