import { PERFIS } from "@cursos/db/schema/formatos";
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
import { concederPontos, linhasDasConcessoes } from "../consultas/concessao";
import {
  abrirCurso,
  apagarCurso,
  erroDoMaterial,
  salvarCurso,
} from "../consultas/edicao-do-curso";
import {
  liberar,
  liberarVarios,
  linhasDoAcesso,
  PESSOA_SUMIU,
  revogar,
} from "../consultas/liberacao";
import {
  liberarParaPerfil,
  linhasDaGrade,
  revogarDoPerfil,
} from "../consultas/liberacao-do-perfil";
import {
  contagemPorPerfil,
  definirPerfil,
  linhasDosPerfis,
  quemTemOPerfil,
} from "../consultas/perfil";
import { linhasDoSaldo, saldosDe } from "../consultas/pontos";
import { comTrava } from "../consultas/trava";
import { montarBusca } from "../dominio/acompanhamento";
import {
  montarComunicados,
  TEXTO_MAX,
  TITULO_MAX,
} from "../dominio/comunicado";
import {
  MOTIVO_DA_CONCESSAO_MAX,
  montarConcessoes,
  TETO_DA_CONCESSAO,
} from "../dominio/concessao";
import { montarGrade } from "../dominio/grade-dos-perfis";
import { montarAcesso, TETO_DO_LOTE } from "../dominio/liberacao";
import { CARACTERES } from "../dominio/limites-do-curso";
import {
  arquivoDoFormulario,
  type MaterialEnviado,
  tituloSugerido,
} from "../dominio/material";
import { montarFicha, montarListaDePessoas } from "../dominio/pessoas";
import { diaLocal, segundaDaSemana } from "../dominio/sequencia";
import type {
  CategoriaId,
  ComunicadoId,
  CursoId,
  LiberacaoDoPerfilId,
  LiberacaoId,
} from "../dominio/tipos";
import { TETO_DO_FILTRO } from "../externos/pessoas";
import { adminProcedure, ErroParaAPessoa, router } from "../index";

// O mesmo formato do check liberacao_user_id_clerk.
const USER_ID = /^user_[A-Za-z0-9]+$/;
const userId = z.string().regex(USER_ID);

const cursoId = z.uuid().transform((id) => id.toLowerCase() as CursoId);
const categoriaId = z.uuid().transform((id) => id.toLowerCase() as CategoriaId);
/** O mesmo formato do check categoria_nome_formato: aparado, de 1 a 80 caracteres. */
const nomeDaCategoria = z.string().trim().min(1).max(CARACTERES.categoria);

const doCurso = z.object({ id: cursoId });

const perfil = z.enum(PERFIS);

const pessoaSumiu = () =>
  new ErroParaAPessoa({ code: "NOT_FOUND", message: PESSOA_SUMIU });

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
     * FormData com "arquivo", montado por formularioDoMaterial. Guarda no bucket
     * e devolve a chave; o material só entra no curso quando o salvarCurso grava
     * o documento com ela.
     */
    enviarMaterial: adminProcedure
      .input(z.instanceof(FormData))
      .mutation(async ({ ctx, input }): Promise<MaterialEnviado> => {
        const arquivo = arquivoDoFormulario(input);
        if (!arquivo) {
          throw new ErroParaAPessoa({
            code: "BAD_REQUEST",
            message: "O envio veio sem o arquivo.",
          });
        }
        const recebido = await ctx.materiais.receber(arquivo);
        if (recebido.tipo === "recusa") {
          throw erroDoMaterial(recebido.recusa);
        }
        return {
          ...recebido.arquivo,
          tituloSugerido: tituloSugerido(recebido.arquivo.nomeDoArquivo),
        };
      }),
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
  liberacoes: router({
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
            message: PESSOA_SUMIU,
          });
        }
        return liberar(ctx.db, ctx.admin, pessoa, input.cursoId, new Date());
      }),
    /** Um resultado por pessoa: a falha de uma não recusa o lote. */
    liberarVarios: adminProcedure
      .input(
        z.object({
          cursoId,
          userIds: z.array(userId).min(1).max(TETO_DO_LOTE),
        })
      )
      .mutation(({ ctx, input }) =>
        liberarVarios(
          ctx.db,
          (id) => ctx.pessoas.porId(id),
          ctx.admin,
          input.userIds,
          input.cursoId,
          new Date()
        )
      ),
    revogar: adminProcedure
      .input(z.object({ liberacaoId: z.uuid() }))
      .mutation(({ ctx, input }) =>
        revogar(ctx.db, ctx.admin, input.liberacaoId as LiberacaoId, new Date())
      ),
  }),
  perfis: router({
    grade: adminProcedure.query(async ({ ctx }) => {
      const [linhas, contagem] = await Promise.all([
        linhasDaGrade(ctx.db),
        contagemPorPerfil(ctx.db),
      ]);
      return montarGrade(linhas, contagem);
    }),
    liberar: adminProcedure
      .input(z.object({ cursoId, perfil }))
      .mutation(({ ctx, input }) =>
        liberarParaPerfil(
          ctx.db,
          ctx.admin,
          input.perfil,
          input.cursoId,
          new Date()
        )
      ),
    revogar: adminProcedure
      .input(z.object({ id: z.uuid() }))
      .mutation(({ ctx, input }) =>
        revogarDoPerfil(
          ctx.db,
          ctx.admin,
          input.id as LiberacaoDoPerfilId,
          new Date()
        )
      ),
  }),
  pessoas: router({
    /**
     * Dá (pontos > 0) ou tira (pontos < 0) pontos de quem o Clerk conhece, com o
     * motivo. Tirar além do saldo é recusado com o saldo na frase.
     */
    concederPontos: adminProcedure
      .input(
        z.object({
          motivo: z.string().trim().min(1).max(MOTIVO_DA_CONCESSAO_MAX),
          pontos: z
            .number()
            .int()
            .min(-TETO_DA_CONCESSAO)
            .max(TETO_DA_CONCESSAO)
            .refine((n) => n !== 0),
          userId,
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!(await ctx.pessoas.conta(input.userId))) {
          throw pessoaSumiu();
        }
        return concederPontos(ctx.db, ctx.admin, input, new Date());
      }),
    definirPapel: adminProcedure
      .input(z.object({ papel: z.enum(["aluno", "admin"]), userId }))
      .mutation(({ ctx, input }) => {
        // Ninguém tira o próprio papel: quem tira o de outro continua admin, e
        // a plataforma nunca fica sem admin.
        if (input.userId === ctx.admin && input.papel === "aluno") {
          throw new ErroParaAPessoa({
            code: "PRECONDITION_FAILED",
            message: "Você não pode tirar o seu próprio papel de admin.",
          });
        }
        // Sob a trava, o papel de quem pede vem do Clerk, não do token: o token
        // diz admin por até 60 s depois de outro admin tirar o papel dele.
        return comTrava(ctx.db, "papel", async () => {
          const [eu, alvo] = await Promise.all([
            ctx.pessoas.conta(ctx.admin),
            ctx.pessoas.conta(input.userId),
          ]);
          if (eu?.papel !== "admin") {
            throw new ErroParaAPessoa({
              code: "FORBIDDEN",
              message: "Você não é mais admin.",
            });
          }
          if (!alvo) {
            throw pessoaSumiu();
          }
          await ctx.pessoas.definirPapel(input.userId, input.papel);
          return { papel: input.papel };
        });
      }),
    definirPerfil: adminProcedure
      .input(z.object({ perfil, userId }))
      .mutation(async ({ ctx, input }) => {
        if (!(await ctx.pessoas.conta(input.userId))) {
          throw pessoaSumiu();
        }
        const { bonus } = await definirPerfil(
          ctx.db,
          ctx.admin,
          input.userId,
          input.perfil,
          new Date()
        );
        return { bonus, perfil: input.perfil };
      }),
    // O userId vem do endereço: fora do formato é uma página que não existe, não um erro.
    ficha: adminProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!USER_ID.test(input.userId)) {
          return null;
        }
        const segunda = segundaDaSemana(diaLocal(new Date()));
        const [conta, [linha], { saldo }, concessoes] = await Promise.all([
          ctx.pessoas.conta(input.userId),
          linhasDosPerfis(ctx.db, [input.userId]),
          linhasDoSaldo(ctx.db, input.userId, segunda),
          linhasDasConcessoes(ctx.db, input.userId),
        ]);
        if (!conta) {
          return null;
        }
        const autores = new Set(concessoes.map((c) => c.concedidaPor));
        const [quemMudou, ...quemConcedeu] = await Promise.all([
          linha?.definidoPor ? ctx.pessoas.porId(linha.definidoPor) : null,
          ...[...autores].map((id) => ctx.pessoas.porId(id)),
        ]);
        return montarFicha(conta, linha, quemMudou ?? null, ctx.admin, {
          concessoes: montarConcessoes(concessoes, quemConcedeu),
          saldo,
        });
      }),
    /**
     * Sem filtro, a busca do Clerk. Com o perfil, só quem já entrou no app com
     * ele: o banco dá os userIds, e o Clerk busca entre eles.
     */
    lista: adminProcedure
      .input(
        z.object({
          perfil: perfil.nullable(),
          termo: z.string().trim().max(100),
        })
      )
      .query(async ({ ctx, input }) => {
        const entre = input.perfil
          ? await quemTemOPerfil(ctx.db, input.perfil, TETO_DO_FILTRO)
          : undefined;
        const [busca, contagem] = await Promise.all([
          ctx.pessoas.buscar(input.termo, entre),
          contagemPorPerfil(ctx.db),
        ]);
        const ids = busca.pessoas.map((p) => p.userId);
        const [linhas, saldos] = await Promise.all([
          linhasDosPerfis(ctx.db, ids),
          saldosDe(ctx.db, ids),
        ]);
        return montarListaDePessoas(
          busca,
          linhas,
          saldos,
          contagem,
          input.perfil
        );
      }),
  }),
});
