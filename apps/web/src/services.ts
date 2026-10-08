import type { Servicos } from "@cursos/api/context";
import { capasDesligadas, capasDoSupabase } from "@cursos/api/externos/capas";
import { createDb } from "@cursos/db";

import { ENV } from "./env.server";

const capas =
  ENV.SUPABASE_URL && ENV.SUPABASE_SERVICE_ROLE_KEY
    ? capasDoSupabase({
        chave: ENV.SUPABASE_SERVICE_ROLE_KEY,
        url: ENV.SUPABASE_URL,
      })
    : capasDesligadas;

/** Montados uma vez por processo. Os dois construtores de Context (context.ts e server/api.ts) usam estes. */
export const servicos: Servicos = { capas, db: createDb(ENV) };
