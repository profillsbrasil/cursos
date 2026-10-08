import { z } from "zod";

import { visaoDoCatalogo } from "../consultas/catalogo";
import {
  abrirCurso,
  apagarCurso,
  salvarCurso,
} from "../consultas/edicao-do-curso";
import { edicaoDeCursoNovo } from "../dominio/edicao-do-curso";
import type { CursoId } from "../dominio/tipos";
import { adminProcedure, router } from "../index";

/** "novo" abre a edição vazia com id gerado aqui; id fora do formato é "não existe". */
const NOVO = "novo";
const UUID = z.uuid();

// Todo procedimento daqui usa adminProcedure; routers/admin.test.ts percorre a árvore e confere.
export const adminRouter = router({
  catalogo: router({
    abrirCurso: adminProcedure
      .input(z.object({ id: z.string() }))
      .query(({ ctx, input }) => {
        if (input.id === NOVO) {
          return edicaoDeCursoNovo(crypto.randomUUID() as CursoId);
        }
        return UUID.safeParse(input.id).success
          ? abrirCurso(ctx.db, input.id as CursoId)
          : null;
      }),
    apagarCurso: adminProcedure
      .input(z.object({ id: z.uuid().transform((id) => id as CursoId) }))
      .mutation(({ ctx, input }) => apagarCurso(ctx.db, input.id)),
    /**
     * FormData com "documento" (JSON de DocumentoDoCurso) e "capa" (arquivo
     * opcional), montado por formularioDoCurso. O fetch adapter do tRPC lê
     * multipart/form-data e entrega o FormData sem lote.
     */
    salvarCurso: adminProcedure
      .input(z.instanceof(FormData))
      .mutation(({ ctx, input }) => salvarCurso(ctx, input)),
    visao: adminProcedure.query(({ ctx }) => visaoDoCatalogo(ctx.db)),
  }),
});
