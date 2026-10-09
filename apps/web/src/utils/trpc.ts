import type { AppRouter } from "@cursos/api/routers/index";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  isNonJsonSerializable,
  splitLink,
} from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";

import { getClerkAuthToken } from "@/utils/clerk-auth";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(error.message, {
        action: {
          label: "Tentar de novo",
          onClick: () => {
            query.invalidate();
          },
        },
      });
    },
  }),
});

async function headers(): Promise<Record<string, string>> {
  if (typeof window !== "undefined") {
    const token = await getClerkAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  const { auth } = await import("@clerk/nextjs/server");
  const clerkAuth = await auth();
  const token = await clerkAuth.getToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

const URL_API = "/api/trpc";

// O registro do player vai sem lote e com keepalive: o httpBatchLink agenda o lote
// num setTimeout, e timer não roda depois do pagehide.
// FormData (o salvarCurso, com a capa) também vai sem lote: o lote serializa a
// entrada em JSON e o arquivo se perderia.
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => op.path === "aula.registrar",
      false: splitLink({
        condition: (op) => isNonJsonSerializable(op.input),
        false: httpBatchLink({ headers, url: URL_API }),
        true: httpLink({ headers, url: URL_API }),
      }),
      true: httpLink({
        fetch: (url, init) => fetch(url, { ...init, keepalive: true }),
        headers,
        url: URL_API,
      }),
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
