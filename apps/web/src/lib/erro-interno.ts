import type { TRPCError } from "@trpc/server";

/**
 * onError do fetchRequestHandler. O adaptador fetch do tRPC não registra erro
 * nenhum: sem isto, um INTERNAL_SERVER_ERROR só aparece no corpo da resposta.
 */
export function registrarErroInterno({
  error,
  path,
}: {
  error: TRPCError;
  path: string | undefined;
}): void {
  if (error.code === "INTERNAL_SERVER_ERROR") {
    console.error(`tRPC ${path ?? "(sem caminho)"} ${error.code}`, error);
  }
}
