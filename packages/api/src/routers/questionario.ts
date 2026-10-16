import { z } from "zod";

import { responder } from "../consultas/questionario";
import { LIMITES } from "../dominio/edicao-do-curso";
import type {
  AlternativaId,
  AulaId,
  PerguntaId,
  TentativaId,
} from "../dominio/tipos";
import { protegidoComTraducao, router } from "../index";

export const envioDoQuestionario = z.object({
  aulaId: z.uuid(),
  respostas: z
    .array(z.object({ alternativaId: z.uuid(), perguntaId: z.uuid() }))
    .max(LIMITES.perguntasPorAula),
  tentativaId: z.uuid(),
});

export const questionarioRouter = router({
  // O servidor corrige: a alternativa certa só volta com a aprovação.
  responder: protegidoComTraducao
    .input(envioDoQuestionario)
    .mutation(({ ctx, input }) =>
      responder(
        ctx.db,
        ctx.auth.userId,
        {
          aulaId: input.aulaId as AulaId,
          respostas: input.respostas.map((r) => ({
            alternativaId: r.alternativaId as AlternativaId,
            perguntaId: r.perguntaId as PerguntaId,
          })),
          tentativaId: input.tentativaId as TentativaId,
        },
        new Date()
      )
    ),
});
