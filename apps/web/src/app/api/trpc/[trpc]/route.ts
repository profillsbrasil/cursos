import { appRouter } from "@cursos/api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

import { createContext } from "../../../../context";
import { ENV } from "../../../../env.server";
import { registrarErroInterno } from "../../../../lib/erro-interno";
import { recusaDeOrigem } from "../../../../lib/origem";

function handler(req: NextRequest) {
  return (
    recusaDeOrigem(req, ENV.CORS_ORIGIN) ??
    fetchRequestHandler({
      createContext: () => createContext(req),
      endpoint: "/api/trpc",
      onError: registrarErroInterno,
      req,
      // A sessão também chega por cookie, e o CDN da Railway guarda resposta
      // pública: a do tRPC nunca é de todo mundo.
      responseMeta: () => ({
        headers: new Headers({ "cache-control": "private, no-store" }),
      }),
      router: appRouter,
    })
  );
}

export { handler as GET, handler as POST };
