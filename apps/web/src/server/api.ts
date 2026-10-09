import "server-only";

import { auth } from "@clerk/nextjs/server";
import { contextoDe, ehAdmin } from "@cursos/api/context";
import { createCaller } from "@cursos/api/routers/index";
import { notFound } from "next/navigation";
import { cache } from "react";

import { servicos } from "@/services";

// React.cache vale por request: generateMetadata e a página pedem a aula e ela roda uma vez.
// auth.protect() manda quem não tem sessão para o login em toda página e layout que
// lê dados por aqui (a checagem por recurso que o Clerk 7 recomenda no lugar do
// createRouteMatcher no proxy). O protectedProcedure continua como segunda porta.
// contextoDe é a mesma leitura de papel do route.ts.
const contexto = cache(async () => contextoDe(await auth.protect(), servicos));

const caller = cache(async () => createCaller(await contexto()));

/**
 * Primeira porta do admin, para as páginas, o layout e os carregadores de /admin.
 * Sem sessão, auth.protect() manda a pessoa para o login. Com sessão e sem o
 * papel de admin, ela vê a 404 do app, sem saber que a área existe. O
 * adminProcedure continua como segunda porta em cada procedimento.
 */
export const exigirAdmin = cache(async () => {
  const ctx = await contexto();
  if (!ehAdmin(ctx.auth)) {
    notFound();
  }
  return createCaller(ctx);
});

/** Para a sidebar do aluno mostrar o link da área do admin. */
export const souAdmin = cache(async () => ehAdmin((await contexto()).auth));

export const carregarPainel = cache(async () =>
  (await caller()).meusCursos.painel()
);

export const carregarResumo = cache(async () =>
  (await caller()).aluno.resumo()
);

export const carregarAula = cache(async (slug: string, aulaId: string) =>
  (await caller()).aula.abrir({ aulaId, slug })
);

export const carregarEntrada = cache(async (slug: string) =>
  (await caller()).aula.entrada({ slug })
);

export const carregarPainelDeTroca = cache(async () =>
  (await caller()).troca.painel()
);

export const carregarCatalogo = cache(async () =>
  (await exigirAdmin()).admin.catalogo.visao()
);

export const carregarCurso = cache(async (id: string) =>
  (await exigirAdmin()).admin.catalogo.abrirCurso({ id })
);

export const carregarPessoas = cache(async (termo: string) =>
  (await exigirAdmin()).admin.alunos.buscar({ termo })
);

/** null: userId fora do formato, ou userId que o Clerk não conhece e que nunca teve liberação. */
export const carregarAcessoDoAluno = cache(async (userId: string) =>
  (await exigirAdmin()).admin.alunos.acesso({ userId })
);

export const carregarComunicados = cache(async () =>
  (await exigirAdmin()).admin.comunicados.lista()
);
