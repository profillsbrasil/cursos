import { SLUG } from "@cursos/db/schema/comum";
import { z } from "zod";

import { carregarAula, carregarEntrada, registrar } from "../consultas/aula";
import type { AulaId } from "../dominio/tipos";
import { protectedProcedure, router } from "../index";

const slug = z.string().regex(new RegExp(SLUG));

const trecho = z
  .object({ fim: z.int().min(1), inicio: z.int().min(0) })
  .refine((t) => t.fim > t.inicio, "Trecho vazio.");

/** A borda: depois dela, tudo é tipo de domínio. */
export const entradaRegistro = z.object({
  aulaId: z.uuid(),
  posicaoSeg: z.int().min(0).max(86_400),
  trechos: z.array(trecho).max(64),
});

export const aulaRouter = router({
  // null em vez de erro: a página responde com notFound(), e curso sem liberação
  // e curso bloqueado dão o mesmo 404.
  abrir: protectedProcedure
    .input(z.object({ aulaId: z.uuid(), slug }))
    .query(({ ctx, input }) =>
      carregarAula(ctx.db, ctx.auth.userId, input.slug, input.aulaId)
    ),
  entrada: protectedProcedure
    .input(z.object({ slug }))
    .query(({ ctx, input }) =>
      carregarEntrada(ctx.db, ctx.auth.userId, input.slug)
    ),
  registrar: protectedProcedure
    .input(entradaRegistro)
    .mutation(async ({ ctx, input }) => {
      const r = await registrar(
        ctx.db,
        ctx.auth.userId,
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
