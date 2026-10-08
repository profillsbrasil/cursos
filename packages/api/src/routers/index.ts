import { publicProcedure, router, t } from "../index";
import { alunoRouter } from "./aluno";
import { aulaRouter } from "./aula";
import { meusCursosRouter } from "./meus-cursos";
import { trocaRouter } from "./troca";

export const appRouter = router({
  aluno: alunoRouter,
  aula: aulaRouter,
  healthCheck: publicProcedure.query(() => "OK"),
  meusCursos: meusCursosRouter,
  troca: trocaRouter,
});
export type AppRouter = typeof appRouter;

export const createCaller = t.createCallerFactory(appRouter);
