import { publicProcedure, router, t } from "../index";
import { alunoRouter } from "./aluno";
import { meusCursosRouter } from "./meus-cursos";

export const appRouter = router({
  aluno: alunoRouter,
  healthCheck: publicProcedure.query(() => "OK"),
  meusCursos: meusCursosRouter,
});
export type AppRouter = typeof appRouter;

export const createCaller = t.createCallerFactory(appRouter);
