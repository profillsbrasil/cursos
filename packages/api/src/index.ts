import { initTRPC, type TRPC_ERROR_CODE_KEY, TRPCError } from "@trpc/server";

import { mensagemDoBanco } from "./consultas/erros";
import { type Context, ehAdmin } from "./context";
import type { AdminId } from "./dominio/tipos";

/**
 * O que a tela decide sem ler o texto: "versao_mudou" pede recarregar, os
 * repetidos apontam o campo. Um nome aqui é contrato com o cliente: não muda.
 */
export type Motivo = "codigo_repetido" | "slug_repetido" | "versao_mudou";

/**
 * Recusa com a mensagem escrita para a pessoa, em pt-BR. O errorFormatter marca
 * `data.paraAPessoa`, e só essa mensagem chega ao toast do useAcao; qualquer
 * outro erro (zod, banco, o NOT_FOUND do próprio tRPC) vira um texto genérico.
 * O `motivo`, quando há, chega em `data.motivo`; sem ele, `data.motivo` é null.
 */
export class ErroParaAPessoa extends TRPCError {
  readonly motivo: Motivo | null;

  constructor(opcoes: {
    cause?: unknown;
    code: TRPC_ERROR_CODE_KEY;
    message: string;
    motivo?: Motivo;
  }) {
    super(opcoes);
    this.motivo = opcoes.motivo ?? null;
  }
}

export const t = initTRPC.context<Context>().create({
  errorFormatter: ({ error, shape }) => {
    const paraAPessoa = error instanceof ErroParaAPessoa;
    return {
      ...shape,
      data: {
        ...shape.data,
        motivo: paraAPessoa ? error.motivo : null,
        paraAPessoa,
      },
    };
  },
});

export const { router } = t;

export const publicProcedure = t.procedure;

// O middleware estreita a sessão: depois dele, ctx.auth é Sessao, não Sessao | null.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  const { auth } = ctx;
  if (!auth) {
    throw new TRPCError({
      cause: "No Clerk userId",
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }
  return next({ ctx: { ...ctx, auth } });
});

/**
 * Violação de restrição com frase em consultas/erros.ts vira ErroParaAPessoa.
 * A regra pura recusa antes; isto cobre a corrida que escapa dela.
 */
const traduzErroDoBanco = t.middleware(async ({ next }) => {
  const resultado = await next();
  if (resultado.ok) {
    return resultado;
  }
  const mensagem = mensagemDoBanco(resultado.error);
  if (mensagem) {
    throw new ErroParaAPessoa({ ...mensagem, cause: resultado.error });
  }
  return resultado;
});

const protegidoComTraducao = protectedProcedure.use(traduzErroDoBanco);

/**
 * Segunda porta do admin; a primeira é exigirAdmin em apps/web/src/server/api.ts.
 * É o único lugar que fabrica um AdminId, então quem grava autoria de admin
 * (liberada_por, revogada_por, publicado_por) só roda atrás desta porta.
 */
export const adminProcedure = protegidoComTraducao.use(({ ctx, next }) => {
  const { auth } = ctx;
  if (!ehAdmin(auth)) {
    throw new ErroParaAPessoa({
      code: "FORBIDDEN",
      message: "Esta ação é só do admin.",
    });
  }
  return next({
    ctx: { ...ctx, admin: auth.userId as AdminId, auth },
  });
});
