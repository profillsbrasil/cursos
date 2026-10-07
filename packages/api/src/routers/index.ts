import { protectedProcedure, publicProcedure, router, t } from "../index";
import { alunoRouter } from "./aluno";
import { meusCursosRouter } from "./meus-cursos";

export const appRouter = router({
  aluno: alunoRouter,
  healthCheck: publicProcedure.query(() => "OK"),
  meusCursos: meusCursosRouter,
  // sai com dashboard/page.tsx no commit do layout do aluno
  privateData: protectedProcedure.query(({ ctx }) => ({
    message: "This is private",
    userId: ctx.auth.userId,
  })),
});
export type AppRouter = typeof appRouter;

export const createCaller = t.createCallerFactory(appRouter);
