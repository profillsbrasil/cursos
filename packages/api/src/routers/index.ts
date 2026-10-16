import { publicProcedure, router, t } from "../index";
import { adminRouter } from "./admin";
import { alunoRouter } from "./aluno";
import { aulaRouter } from "./aula";
import { certificadoRouter } from "./certificado";
import { cursoRouter } from "./curso";
import { meusCursosRouter } from "./meus-cursos";
import { questionarioRouter } from "./questionario";
import { trocaRouter } from "./troca";

export const appRouter = router({
  admin: adminRouter,
  aluno: alunoRouter,
  aula: aulaRouter,
  certificado: certificadoRouter,
  curso: cursoRouter,
  healthCheck: publicProcedure.query(() => "OK"),
  meusCursos: meusCursosRouter,
  questionario: questionarioRouter,
  troca: trocaRouter,
});
export type AppRouter = typeof appRouter;

export const createCaller = t.createCallerFactory(appRouter);
