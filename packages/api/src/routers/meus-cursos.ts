import { carregarPainel } from "../consultas/meus-cursos";
import { alunoProcedure, router } from "../index";

export const meusCursosRouter = router({
  painel: alunoProcedure.query(({ ctx }) =>
    carregarPainel(ctx.db, ctx.aluno, new Date())
  ),
});
