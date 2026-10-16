import { carregarConquistas } from "../consultas/conquistas";
import { carregarResumo } from "../consultas/meus-cursos";
import { protectedProcedure, router } from "../index";

export const alunoRouter = router({
  conquistas: protectedProcedure.query(({ ctx }) =>
    carregarConquistas(ctx.db, ctx.auth.userId, new Date())
  ),
  resumo: protectedProcedure.query(({ ctx }) =>
    carregarResumo(ctx.db, ctx.auth.userId, new Date())
  ),
});
