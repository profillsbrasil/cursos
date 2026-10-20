import { SLUG } from "@cursos/db/schema/formatos";
import { z } from "zod";

import {
  carregarPaginaDoCertificado,
  conferir,
} from "../consultas/certificado-emitido";
import { codigoDigitado } from "../dominio/certificado";
import { alunoProcedure, publicProcedure, router } from "../index";

const FORMATO_DO_SLUG = new RegExp(SLUG);

export const certificadoRouter = router({
  conferir: publicProcedure
    .input(z.object({ codigo: z.string().max(64) }))
    .query(({ ctx, input }) => {
      const codigo = codigoDigitado(input.codigo);
      return codigo ? conferir(ctx, codigo) : null;
    }),
  pagina: alunoProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) =>
      FORMATO_DO_SLUG.test(input.slug)
        ? carregarPaginaDoCertificado(ctx, ctx.aluno, input.slug)
        : null
    ),
});
