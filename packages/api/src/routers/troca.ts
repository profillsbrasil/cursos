import { z } from "zod";

import {
  carregarPainelDeTroca,
  carregarTemCursoTrocavelNaVitrine,
  trocar,
} from "../consultas/troca";
import { idDe } from "../dominio/esquemas-de-marca";
import { ehCursoId } from "../dominio/marcas";
import { alunoProcedure, router } from "../index";

export const trocaRouter = router({
  painel: alunoProcedure.query(({ ctx }) =>
    carregarPainelDeTroca(ctx.db, ctx.aluno, new Date())
  ),
  temCursoTrocavelNaVitrine: alunoProcedure.query(({ ctx }) =>
    carregarTemCursoTrocavelNaVitrine(ctx.db, ctx.aluno)
  ),
  trocar: alunoProcedure
    .input(
      z.object({ cursoId: idDe(ehCursoId), precoVisto: z.int().positive() })
    )
    .mutation(({ ctx, input }) =>
      trocar(ctx.db, ctx.aluno, input.cursoId, input.precoVisto, new Date())
    ),
});
