import { z } from "zod";

import {
  carregarPainelDeTroca,
  carregarTemCursoTrocavelNaVitrine,
  trocar,
} from "../consultas/troca";
import type { CursoId } from "../dominio/tipos";
import { protectedProcedure, router } from "../index";

export const trocaRouter = router({
  painel: protectedProcedure.query(({ ctx }) =>
    carregarPainelDeTroca(ctx.db, ctx.auth.userId, new Date())
  ),
  // Só Meus cursos chama, para o botão de Sua semana. Trocar pontos lê o mesmo
  // fato do painel.
  temCursoTrocavelNaVitrine: protectedProcedure.query(({ ctx }) =>
    carregarTemCursoTrocavelNaVitrine(ctx.db, ctx.auth.userId)
  ),
  trocar: protectedProcedure
    .input(z.object({ cursoId: z.uuid(), precoVisto: z.int().positive() }))
    .mutation(({ ctx, input }) =>
      trocar(
        ctx.db,
        ctx.auth.userId,
        input.cursoId as CursoId,
        input.precoVisto,
        new Date()
      )
    ),
});
