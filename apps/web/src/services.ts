import { createClerkClient } from "@clerk/backend";
import type { Servicos } from "@cursos/api/context";
import { capasDesligadas, capasNoBucket } from "@cursos/api/externos/capas";
import { pessoasDoClerk } from "@cursos/api/externos/pessoas";
import { createDb } from "@cursos/db";

import { ENV } from "./env.server";

const capas =
  ENV.S3_ENDPOINT &&
  ENV.S3_REGION &&
  ENV.S3_BUCKET &&
  ENV.S3_ACCESS_KEY_ID &&
  ENV.S3_SECRET_ACCESS_KEY
    ? capasNoBucket({
        bucket: ENV.S3_BUCKET,
        endpoint: ENV.S3_ENDPOINT,
        idDaChave: ENV.S3_ACCESS_KEY_ID,
        regiao: ENV.S3_REGION,
        segredo: ENV.S3_SECRET_ACCESS_KEY,
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
