import { SLUG } from "@cursos/db/schema/formatos";
import { z } from "zod";

import { carregarPaginaDoCurso } from "../consultas/aula";
import { materialParaBaixar } from "../consultas/material";
import { ehAdmin } from "../context";
import type { MaterialId } from "../dominio/tipos";
import { alunoProcedure, router } from "../index";

const FORMATO_DO_SLUG = new RegExp(SLUG);

export const cursoRouter = router({
  /**
   * O arquivo de um material de apoio, para a rota de download. null para id
   * fora do formato, que não existe ou que a pessoa não pode ver: a rota
   * responde 404 nos três, sem dizer qual.
   */
  material: alunoProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const id = z.uuid().safeParse(input.id);
      return id.success
        ? materialParaBaixar(
            ctx.db,
            { admin: ehAdmin(ctx.auth), aluno: ctx.aluno },
            id.data.toLowerCase() as MaterialId
          )
        : null;
    }),
  pagina: alunoProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) =>
      FORMATO_DO_SLUG.test(input.slug)
        ? carregarPaginaDoCurso(ctx.db, ctx.aluno, input.slug)
        : null
    ),
});
