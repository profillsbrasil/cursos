import { SLUG } from "@cursos/db/schema/formatos";
import { z } from "zod";

import { carregarAula, registrar } from "../consultas/aula";
import { TRECHOS_POR_ENVIO } from "../dominio/regras";
import type { AulaId } from "../dominio/tipos";
import { alunoComTraducao, alunoProcedure, router } from "../index";

const FORMATO_DO_SLUG = new RegExp(SLUG);
const UUID = z.uuid();

const trecho = z
  .object({ fim: z.int().min(1), inicio: z.int().min(0) })
  .refine((t) => t.fim > t.inicio, "Trecho vazio.");

export const entradaRegistro = z.object({
  aulaId: z.uuid(),
  posicaoSeg: z.int().min(0).max(86_400),
  trechos: z.array(trecho).max(TRECHOS_POR_ENVIO),
});

export const aulaRouter = router({
  abrir: alunoProcedure
    .input(z.object({ aulaId: z.string(), slug: z.string() }))
    .query(({ ctx, input }) =>
      FORMATO_DO_SLUG.test(input.slug) && UUID.safeParse(input.aulaId).success
        ? carregarAula(ctx.db, ctx.aluno, input.slug, input.aulaId)
        : null
    ),
  // A tradução leva o lock_timeout de registrar a TOO_MANY_REQUESTS.
  registrar: alunoComTraducao
    .input(entradaRegistro)
    .mutation(async ({ ctx, input }) => {
      const r = await registrar(
        ctx.db,
        ctx.aluno,
        input.aulaId as AulaId,
        { posicaoSeg: input.posicaoSeg, trechos: input.trechos },
        new Date()
      );
      if (r.recusadosSeg > 0) {
        console.warn(
          `cota de vídeo recusou ${r.recusadosSeg} s na aula ${input.aulaId}`
        );
      }
      return r;
    }),
});
