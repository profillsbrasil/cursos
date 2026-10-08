import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { visaoDoCatalogo } from "../consultas/catalogo";
import { carregarAcesso, liberar, revogar } from "../consultas/liberacao";
import type { Alvo } from "../dominio/liberacao";
import type { LiberacaoId } from "../dominio/tipos";
import { adminProcedure, router } from "../index";

// O mesmo formato do check liberacao_user_id_clerk.
const USER_ID = /^user_[A-Za-z0-9]+$/;
const userId = z.string().regex(USER_ID);

const alvo = z.discriminatedUnion("tipo", [
  z.object({ id: z.uuid(), tipo: z.literal("curso") }),
  z.object({ id: z.uuid(), tipo: z.literal("trilha") }),
]);

// Todo procedimento daqui usa adminProcedure; routers/admin.test.ts percorre a árvore e confere.
export const adminRouter = router({
  alunos: router({
    // O userId vem do endereço: fora do formato é uma página que não existe, não um erro.
    acesso: adminProcedure
      .input(z.object({ userId: z.string().max(100) }))
      .query(async ({ ctx, input }) =>
        USER_ID.test(input.userId)
          ? carregarAcesso(
              ctx.db,
              input.userId,
              await ctx.pessoas.porId(input.userId)
            )
          : null
      ),
    buscar: adminProcedure
      .input(z.object({ termo: z.string().trim().max(100) }))
      .query(({ ctx, input }) => ctx.pessoas.buscar(input.termo)),
    liberar: adminProcedure
      .input(z.object({ alvo, userId }))
      .mutation(async ({ ctx, input }) => {
        if (!(await ctx.pessoas.porId(input.userId))) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Esta pessoa não existe mais no login da plataforma.",
          });
        }
        return liberar(
          ctx.db,
          ctx.admin,
          input.userId,
          input.alvo as Alvo,
          new Date()
        );
      }),
    revogar: adminProcedure
      .input(z.object({ liberacaoId: z.uuid() }))
      .mutation(({ ctx, input }) =>
        revogar(ctx.db, ctx.admin, input.liberacaoId as LiberacaoId, new Date())
      ),
  }),
  catalogo: router({
    visao: adminProcedure.query(({ ctx }) => visaoDoCatalogo(ctx.db)),
  }),
});
