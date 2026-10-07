import type { Context as ApiContext } from "@cursos/api/context";

import { db } from "./services";

type ClerkContextAuth = ApiContext["auth"];

function toClerkContextAuth(auth: ClerkContextAuth): ClerkContextAuth {
  return auth ? { userId: auth.userId } : null;
}

import { createClerkClient } from "@clerk/backend";

import { ENV } from "./env.server";

const clerkClient = createClerkClient({
  publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
  secretKey: ENV.CLERK_SECRET_KEY,
});

async function authenticateClerkRequest(
  request: Request
): Promise<ClerkContextAuth> {
  const requestState = await clerkClient.authenticateRequest(request, {
    authorizedParties: [ENV.CORS_ORIGIN],
  });
  return toClerkContextAuth(requestState.toAuth());
}

import type { NextRequest } from "next/server";

export async function createContext(req: NextRequest): Promise<ApiContext> {
  const clerkAuth = await authenticateClerkRequest(req);
  return {
    auth: clerkAuth,
    db,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
