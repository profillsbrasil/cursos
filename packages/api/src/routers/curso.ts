import { SLUG } from "@cursos/db/schema/formatos";
import { z } from "zod";

import { carregarPaginaDoCurso } from "../consultas/aula";
import { materialParaBaixar } from "../consultas/material";
import type { MaterialId } from "../dominio/tipos";
import { protectedProcedure, router } from "../index";

const FORMATO_DO_SLUG = new RegExp(SLUG);

export const cursoRouter = router({
  /**
   * O arquivo de um material de apoio, para a rota de download. null para id
   * fora do formato, que não existe ou que a pessoa não pode ver: a rota
   * responde 404 nos três, sem dizer qual.
   */
  material: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const id = z.uuid().safeParse(input.id);
      return id.success
        ? materialParaBaixar(
            ctx.db,
            ctx.auth,
            id.data.toLowerCase() as MaterialId
          )
        : null;
    }),
  pagina: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) =>
      FORMATO_DO_SLUG.test(input.slug)
        ? carregarPaginaDoCurso(ctx.db, ctx.auth.userId, input.slug)
        : null
    ),
});
