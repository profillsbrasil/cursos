import { z } from "zod";

import { visaoDoCatalogo } from "../consultas/catalogo";
import {
  apagarComunicado,
  linhasDosComunicados,
  salvarComunicado,
} from "../consultas/comunicado";
import {
  abrirTrilha,
  apagarTrilha,
  salvarTrilha,
} from "../consultas/edicao-da-trilha";
import {
  abrirCurso,
  apagarCurso,
  salvarCurso,
} from "../consultas/edicao-do-curso";
import { liberar, linhasDoAcesso, revogar } from "../consultas/liberacao";
import {
  montarComunicados,
  TEXTO_MAX,
  TITULO_MAX,
} from "../dominio/comunicado";
import { documentoDaTrilha } from "../dominio/edicao-da-trilha";
import { montarAcesso, type PedidoDeLiberar } from "../dominio/liberacao";
import type {
  ComunicadoId,
  CursoId,
  LiberacaoId,
  TrilhaId,
} from "../dominio/tipos";
import { adminProcedure, ErroParaAPessoa, router } from "../index";

// O mesmo formato do check liberacao_user_id_clerk.
const USER_ID = /^user_[A-Za-z0-9]+$/;
const userId = z.string().regex(USER_ID);

const alvo = z.discriminatedUnion("tipo", [
  z.object({ id: z.uuid(), tipo: z.literal("curso") }),
  z.object({
    id: z.uuid(),
    tipo: z.literal("trilha"),
    trocadosVistos: z.array(z.uuid()).max(500),
  }),
]);

const doCurso = z.object({
  id: z.uuid().transform((id) => id.toLowerCase() as CursoId),
});

const daTrilha = z.object({
  id: z.uuid().transform((id) => id.toLowerCase() as TrilhaId),
});

// Todo procedimento daqui usa adminProcedure; routers/admin.test.ts percorre a árvore e confere.
export const adminRouter = router({
  alunos: router({
    // O userId vem do endereço: fora do formato é uma página que não existe, não um erro.
    acesso: adminProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!USER_ID.test(input.userId)) {
          return null;
        }
        const [pessoa, linhas] = await Promise.all([
          ctx.pessoas.porId(input.userId),
          linhasDoAcesso(ctx.db, input.userId),
        ]);
        return montarAcesso(input.userId, pessoa, linhas);
      }),
    buscar: adminProcedure
      .input(z.object({ termo: z.string().trim().max(100) }))
      .query(({ ctx, input }) => ctx.pessoas.buscar(input.termo)),
    liberar: adminProcedure
      .input(z.object({ alvo, userId }))
      .mutation(async ({ ctx, input }) => {
        const pessoa = await ctx.pessoas.porId(input.userId);
        if (!pessoa) {
          throw new ErroParaAPessoa({
            code: "NOT_FOUND",
            message: "Esta pessoa não existe mais no login da plataforma.",
          });
        }
        return liberar(
          ctx.db,
          ctx.admin,
          pessoa,
          input.alvo as PedidoDeLiberar,
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
    /**
     * null quando o id não existe. O curso novo não passa por aqui: quem abre o
     * rascunho gera o id uma vez e monta a edição com edicaoDeCursoNovo(id).
     */
    abrirCurso: adminProcedure
      .input(doCurso)
      .query(({ ctx, input }) => abrirCurso(ctx.db, input.id)),
    abrirTrilha: adminProcedure
      .input(daTrilha)
      .query(({ ctx, input }) => abrirTrilha(ctx.db, input.id)),
    apagarCurso: adminProcedure
      .input(doCurso)
      .mutation(({ ctx, input }) => apagarCurso(ctx.db, input.id)),
    apagarTrilha: adminProcedure
      .input(daTrilha)
      .mutation(({ ctx, input }) => apagarTrilha(ctx.db, input.id)),
    /**
     * FormData com "documento" (JSON de DocumentoDoCurso) e "capa" (arquivo
     * opcional), montado por formularioDoCurso. O fetch adapter do tRPC lê
     * multipart/form-data e entrega o FormData sem lote.
     */
    salvarCurso: adminProcedure
      .input(z.instanceof(FormData))
      .mutation(({ ctx, input }) => salvarCurso(ctx, input)),
    salvarTrilha: adminProcedure
      .input(documentoDaTrilha)
      .mutation(({ ctx, input }) => salvarTrilha(ctx.db, input)),
    visao: adminProcedure.query(({ ctx }) => visaoDoCatalogo(ctx.db)),
  }),
  comunicados: router({
    apagar: adminProcedure
      .input(z.object({ id: z.uuid() }))
      .mutation(({ ctx, input }) =>
        apagarComunicado(ctx.db, input.id as ComunicadoId)
      ),
    lista: adminProcedure.query(async ({ ctx }) => {
      const linhas = await linhasDosComunicados(ctx.db);
      const autores = new Set(linhas.comunicados.map((c) => c.publicadoPor));
      return montarComunicados(
        linhas,
        await Promise.all([...autores].map((id) => ctx.pessoas.porId(id)))
      );
    }),
    salvar: adminProcedure
      .input(
        z.object({
          cursoId: z.uuid().nullable(),
          id: z.uuid(),
          texto: z.string().trim().min(1).max(TEXTO_MAX),
          titulo: z.string().trim().min(1).max(TITULO_MAX),
        })
      )
      .mutation(({ ctx, input }) =>
        salvarComunicado(
          ctx.db,
          ctx.admin,
          {
            cursoId: input.cursoId as CursoId | null,
            id: input.id as ComunicadoId,
            texto: input.texto,
            titulo: input.titulo,
          },
          new Date()
        )
      ),
  }),
});
