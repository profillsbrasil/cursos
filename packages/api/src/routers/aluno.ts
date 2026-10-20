import { linhasDosComunicadosDoAluno } from "../consultas/comunicado";
import { carregarConquistas } from "../consultas/conquistas";
import { carregarResumo } from "../consultas/meus-cursos";
import { montarComunicadosDoAluno } from "../dominio/comunicado";
import { alunoProcedure, protectedProcedure, router } from "../index";

export const alunoRouter = router({
  comunicados: alunoProcedure.query(async ({ ctx }) => {
    const linhas = await linhasDosComunicadosDoAluno(ctx.db, ctx.aluno);
    const autores = new Set(linhas.map((c) => c.publicadoPor));
    return montarComunicadosDoAluno(
      linhas,
      await Promise.all([...autores].map((id) => ctx.pessoas.porId(id)))
    );
  }),
  conquistas: alunoProcedure.query(({ ctx }) =>
    carregarConquistas(ctx.db, ctx.aluno, new Date())
  ),
  resumo: protectedProcedure.query(({ ctx }) =>
    carregarResumo(ctx.db, ctx.auth.userId, new Date())
  ),
});
