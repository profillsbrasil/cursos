import { createClerkClient } from "@clerk/backend";
import type { Servicos } from "@cursos/api/context";
import { capasDesligadas, capasNoBucket } from "@cursos/api/externos/capas";
import {
  materiaisDesligados,
  materiaisNoBucket,
} from "@cursos/api/externos/materiais";
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

/** O endpoint e a região são os mesmos do bucket das capas; as chaves, não. */
const materiais =
  ENV.S3_ENDPOINT &&
  ENV.S3_REGION &&
  ENV.S3_MATERIAIS_BUCKET &&
  ENV.S3_MATERIAIS_ACCESS_KEY_ID &&
  ENV.S3_MATERIAIS_SECRET_ACCESS_KEY
    ? materiaisNoBucket({
        bucket: ENV.S3_MATERIAIS_BUCKET,
        endpoint: ENV.S3_ENDPOINT,
        idDaChave: ENV.S3_MATERIAIS_ACCESS_KEY_ID,
        regiao: ENV.S3_REGION,
        segredo: ENV.S3_MATERIAIS_SECRET_ACCESS_KEY,
      })
    : materiaisDesligados;

/** O mesmo cliente valida o token (context.ts) e serve de diretório de pessoas. */
export const clerk = createClerkClient({
  publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
  secretKey: ENV.CLERK_SECRET_KEY,
});

/** Montados uma vez por processo. Os dois construtores de Context (context.ts e server/api.ts) usam estes. */
export const servicos: Servicos = {
  capas,
  db: createDb(ENV),
  materiais,
  pessoas: pessoasDoClerk(clerk),
};
