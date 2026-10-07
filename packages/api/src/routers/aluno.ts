import { carregarResumo } from "../consultas/meus-cursos";
import { protectedProcedure, router } from "../index";

export const alunoRouter = router({
  resumo: protectedProcedure.query(({ ctx }) =>
    carregarResumo(ctx.db, ctx.auth.userId, new Date())
  ),
});
