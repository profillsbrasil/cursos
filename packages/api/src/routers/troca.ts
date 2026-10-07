import { z } from "zod";

import { carregarPainelDeTroca, trocar } from "../consultas/troca";
import type { CursoId } from "../dominio/tipos";
import { protectedProcedure, router } from "../index";

export const trocaRouter = router({
  painel: protectedProcedure.query(({ ctx }) =>
    carregarPainelDeTroca(ctx.db, ctx.auth.userId, new Date())
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
