import { z } from "zod";

import { visaoDoCatalogo } from "../consultas/catalogo";
import {
  abrirCurso,
  apagarCurso,
  salvarCurso,
} from "../consultas/edicao-do-curso";
import type { CursoId } from "../dominio/tipos";
import { adminProcedure, router } from "../index";

const doCurso = z.object({
  id: z.uuid().transform((id) => id.toLowerCase() as CursoId),
});

// Todo procedimento daqui usa adminProcedure; routers/admin.test.ts percorre a árvore e confere.
export const adminRouter = router({
  catalogo: router({
    /**
     * null quando o id não existe. O curso novo não passa por aqui: quem abre o
     * rascunho gera o id uma vez e monta a edição com edicaoDeCursoNovo(id).
     */
    abrirCurso: adminProcedure
      .input(doCurso)
      .query(({ ctx, input }) => abrirCurso(ctx.db, input.id)),
    apagarCurso: adminProcedure
      .input(doCurso)
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
