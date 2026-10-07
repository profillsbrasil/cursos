import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const { router } = t;

export const publicProcedure = t.procedure;

// O middleware estreita o userId: depois dele, ctx.auth.userId é string, não string | null.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  const userId = ctx.auth?.userId;
  if (!userId) {
    throw new TRPCError({
      cause: "No Clerk userId",
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }
  return next({
    ctx: {
      ...ctx,
      auth: { userId },
    },
  });
});
