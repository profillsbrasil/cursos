import type { Servicos } from "@cursos/api/context";
import { createDb } from "@cursos/db";

import { ENV } from "./env.server";

/** Montados uma vez por processo. Os dois construtores de Context (context.ts e server/api.ts) usam estes. */
export const servicos: Servicos = { db: createDb(ENV) };
