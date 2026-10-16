import { z } from "zod";

import { linhasDaBusca } from "../consultas/acompanhamento";
import { visaoDoCatalogo } from "../consultas/catalogo";
import {
  apagarCategoria,
  listarCategorias,
  salvarCategoria,
} from "../consultas/categoria";
import {
  apagarComunicado,
  linhasDosComunicados,
  salvarComunicado,
} from "../consultas/comunicado";
import {
  abrirCurso,
  apagarCurso,
  salvarCurso,
} from "../consultas/edicao-do-curso";
import { liberar, linhasDoAcesso, revogar } from "../consultas/liberacao";
import { montarBusca } from "../dominio/acompanhamento";
import { nomeDaCategoria } from "../dominio/categoria";
import {
  montarComunicados,
  TEXTO_MAX,
  TITULO_MAX,
} from "../dominio/comunicado";
import { montarAcesso } from "../dominio/liberacao";
import { diaLocal } from "../dominio/sequencia";
import type {
  CategoriaId,
  ComunicadoId,
  CursoId,
  LiberacaoId,
} from "../dominio/tipos";
import { adminProcedure, ErroParaAPessoa, router } from "../index";

// O mesmo formato do check liberacao_user_id_clerk.
const USER_ID = /^user_[A-Za-z0-9]+$/;
const userId = z.string().regex(USER_ID);

const cursoId = z.uuid().transform((id) => id.toLowerCase() as CursoId);
const categoriaId = z.uuid().transform((id) => id.toLowerCase() as CategoriaId);

const doCurso = z.object({ id: cursoId });

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
        return montarAcesso(input.userId, pessoa, linhas, diaLocal(new Date()));
      }),
    // Duas idas em série: o Clerk entrega a página, e o banco lê o estudo dos userIds dela.
    buscar: adminProcedure
      .input(z.object({ termo: z.string().trim().max(100) }))
      .query(async ({ ctx, input }) => {
        const resultado = await ctx.pessoas.buscar(input.termo);
        const linhas = await linhasDaBusca(
          ctx.db,
          resultado.pessoas.map((p) => p.userId)
        );
        return montarBusca(resultado, linhas, diaLocal(new Date()));
      }),
    liberar: adminProcedure
      .input(z.object({ cursoId, userId }))
      .mutation(async ({ ctx, input }) => {
        const pessoa = await ctx.pessoas.porId(input.userId);
        if (!pessoa) {
          throw new ErroParaAPessoa({
            code: "NOT_FOUND",
            message: "Esta pessoa não existe mais no login da plataforma.",
          });
        }
        return liberar(ctx.db, ctx.admin, pessoa, input.cursoId, new Date());
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
  categorias: router({
    apagar: adminProcedure
      .input(z.object({ id: categoriaId }))
      .mutation(({ ctx, input }) => apagarCategoria(ctx.db, input.id)),
    lista: adminProcedure.query(({ ctx }) => listarCategorias(ctx.db)),
    /** Upsert pelo id que nasce no cliente, como em comunicados. */
    salvar: adminProcedure
      .input(z.object({ id: categoriaId, nome: nomeDaCategoria }))
      .mutation(({ ctx, input }) => salvarCategoria(ctx.db, input)),
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
