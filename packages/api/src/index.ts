import { initTRPC, TRPCError } from "@trpc/server";

import { type Context, ehAdmin } from "./context";
import type { AdminId } from "./dominio/tipos";

/**
 * Recusa com a mensagem escrita para a pessoa, em pt-BR. O errorFormatter marca
 * `data.paraAPessoa`, e só essa mensagem chega ao toast do useAcao; qualquer
 * outro erro (zod, banco, o NOT_FOUND do próprio tRPC) vira um texto genérico.
 */
export class ErroParaAPessoa extends TRPCError {}

export const t = initTRPC.context<Context>().create({
  errorFormatter: ({ error, shape }) => ({
    ...shape,
    data: { ...shape.data, paraAPessoa: error instanceof ErroParaAPessoa },
  }),
});

export const { router } = t;

export const publicProcedure = t.procedure;

// O middleware estreita a sessão: depois dele, ctx.auth é Sessao, não Sessao | null.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  const { auth } = ctx;
  if (!auth) {
    throw new TRPCError({
      cause: "No Clerk userId",
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }
  return next({ ctx: { ...ctx, auth } });
});

/**
 * Segunda porta do admin; a primeira é exigirAdmin em apps/web/src/server/api.ts.
 * É o único lugar que fabrica um AdminId, então quem grava autoria de admin
 * (liberada_por, revogada_por, publicado_por) só roda atrás desta porta.
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const { auth } = ctx;
  if (!ehAdmin(auth)) {
    throw new ErroParaAPessoa({
      code: "FORBIDDEN",
      message: "Esta ação é só do admin.",
    });
  }
  return next({
    ctx: { ...ctx, admin: auth.userId as AdminId, auth },
  });
});
