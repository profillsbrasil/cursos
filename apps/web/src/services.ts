import { createClerkClient } from "@clerk/backend";
import type { Servicos } from "@cursos/api/context";
import { pessoasDoClerk } from "@cursos/api/externos/pessoas";
import { createDb } from "@cursos/db";

import { ENV } from "./env.server";

/** O mesmo cliente valida o token (context.ts) e serve de diretório de pessoas. */
export const clerk = createClerkClient({
  publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
  secretKey: ENV.CLERK_SECRET_KEY,
});

/** Montados uma vez por processo. Os dois construtores de Context (context.ts e server/api.ts) usam estes. */
export const servicos: Servicos = {
  db: createDb(ENV),
  pessoas: pessoasDoClerk(clerk),
};
