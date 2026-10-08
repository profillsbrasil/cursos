import { createClerkClient } from "@clerk/backend";
import type { Servicos } from "@cursos/api/context";
import { capasDesligadas, capasDoSupabase } from "@cursos/api/externos/capas";
import { pessoasDoClerk } from "@cursos/api/externos/pessoas";
import { createDb } from "@cursos/db";

import { ENV } from "./env.server";

const capas =
  ENV.SUPABASE_URL && ENV.SUPABASE_SERVICE_ROLE_KEY
    ? capasDoSupabase({
        chave: ENV.SUPABASE_SERVICE_ROLE_KEY,
        url: ENV.SUPABASE_URL,
      })
    : capasDesligadas;

/** O mesmo cliente valida o token (context.ts) e serve de diretório de pessoas. */
export const clerk = createClerkClient({
  publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
  secretKey: ENV.CLERK_SECRET_KEY,
});

/** Montados uma vez por processo. Os dois construtores de Context (context.ts e server/api.ts) usam estes. */
export const servicos: Servicos = {
  capas,
  db: createDb(ENV),
  pessoas: pessoasDoClerk(clerk),
};
