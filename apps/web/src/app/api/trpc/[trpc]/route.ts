import { appRouter } from "@cursos/api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

import { createContext } from "../../../../context";
import { ENV } from "../../../../env.server";
import { recusaDeOrigem } from "../../../../lib/origem";

function handler(req: NextRequest) {
  return (
    recusaDeOrigem(req, ENV.CORS_ORIGIN) ??
    fetchRequestHandler({
      createContext: () => createContext(req),
      endpoint: "/api/trpc",
      req,
      router: appRouter,
    })
  );
}

export { handler as GET, handler as POST };
