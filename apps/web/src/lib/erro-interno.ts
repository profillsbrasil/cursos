import type { TRPCError } from "@trpc/server";

/**
 * onError do fetchRequestHandler. O adaptador fetch do tRPC não registra erro
 * nenhum: sem isto, um INTERNAL_SERVER_ERROR só aparece no corpo da resposta.
 * O TOO_MANY_REQUESTS (o lock_timeout do aula.registrar) vira um aviso com
 * caminho e userId, sem o erro: o envio de saída recusado não volta, e o aviso é
 * o único jeito de ver que a espera pela cota esgota em produção.
 */
export function registrarErroInterno({
  ctx,
  error,
  path,
}: {
  ctx?: { auth: { userId: string } | null };
  error: TRPCError;
  path: string | undefined;
}): void {
  const caminho = path ?? "(sem caminho)";
  if (error.code === "INTERNAL_SERVER_ERROR") {
    console.error(`tRPC ${caminho} ${error.code}`, error);
  } else if (error.code === "TOO_MANY_REQUESTS") {
    console.warn(
      `tRPC ${caminho} ${error.code} ${ctx?.auth?.userId ?? "(sem sessão)"}`
    );
  }
}
