import { SLUG } from "@cursos/db/schema/formatos";
import { z } from "zod";

import { carregarPaginaDoCurso } from "../consultas/aula";
import { protectedProcedure, router } from "../index";

const FORMATO_DO_SLUG = new RegExp(SLUG);

export const cursoRouter = router({
  pagina: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) =>
      FORMATO_DO_SLUG.test(input.slug)
        ? carregarPaginaDoCurso(ctx.db, ctx.auth.userId, input.slug)
        : null
    ),
});
