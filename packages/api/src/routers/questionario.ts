import { z } from "zod";

import { responder } from "../consultas/questionario";
import { idDe } from "../dominio/esquemas-de-marca";
import { LIMITES } from "../dominio/limites-do-curso";
import {
  ehAlternativaId,
  ehAulaId,
  ehPerguntaId,
  ehTentativaId,
} from "../dominio/marcas";
import { alunoComTraducao, router } from "../index";

export const envioDoQuestionario = z.object({
  aulaId: idDe(ehAulaId),
  respostas: z
    .array(
      z.object({
        alternativaId: idDe(ehAlternativaId),
        perguntaId: idDe(ehPerguntaId),
      })
    )
    .max(LIMITES.perguntasPorAula),
  tentativaId: idDe(ehTentativaId),
});

export const questionarioRouter = router({
  responder: alunoComTraducao
    .input(envioDoQuestionario)
    .mutation(({ ctx, input }) =>
      responder(ctx.db, ctx.aluno, input, new Date())
    ),
});
