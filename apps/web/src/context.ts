import { createClerkClient } from "@clerk/backend";
import { type Context, contextoDe } from "@cursos/api/context";
import type { NextRequest } from "next/server";

import { ENV } from "./env.server";
import { servicos } from "./services";

const clerk = createClerkClient({
  publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
  secretKey: ENV.CLERK_SECRET_KEY,
});

/** Context do route.ts do tRPC. O papel sai de contextoDe, a mesma leitura de server/api.ts. */
export async function createContext(req: NextRequest): Promise<Context> {
  const estado = await clerk.authenticateRequest(req, {
    authorizedParties: [ENV.CORS_ORIGIN],
  });
  return contextoDe(estado.toAuth(), servicos);
}
