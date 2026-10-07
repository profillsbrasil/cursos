import { carregarPainel } from "../consultas/meus-cursos";
import { protectedProcedure, router } from "../index";

export const meusCursosRouter = router({
  painel: protectedProcedure.query(({ ctx }) =>
    carregarPainel(ctx.db, ctx.auth.userId, new Date())
  ),
});
