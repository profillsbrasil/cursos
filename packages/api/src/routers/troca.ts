import { z } from "zod";

import {
  carregarPainelDeTroca,
  carregarTemCursoTrocavelNaVitrine,
  trocar,
} from "../consultas/troca";
import type { CursoId } from "../dominio/tipos";
import { alunoProcedure, router } from "../index";

export const trocaRouter = router({
  painel: alunoProcedure.query(({ ctx }) =>
    carregarPainelDeTroca(ctx.db, ctx.aluno, new Date())
  ),
  // Só Meus cursos chama, para o botão de Sua semana. Trocar pontos lê o mesmo
  // fato do painel.
  temCursoTrocavelNaVitrine: alunoProcedure.query(({ ctx }) =>
    carregarTemCursoTrocavelNaVitrine(ctx.db, ctx.aluno)
  ),
  trocar: alunoProcedure
    .input(z.object({ cursoId: z.uuid(), precoVisto: z.int().positive() }))
    .mutation(({ ctx, input }) =>
      trocar(
        ctx.db,
        ctx.aluno,
        input.cursoId as CursoId,
        input.precoVisto,
        new Date()
      )
    ),
});
