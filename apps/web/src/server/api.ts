import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createCaller } from "@cursos/api/routers/index";
import { cache } from "react";

import { db } from "@/services";

// React.cache vale por request: generateMetadata e a página pedem a aula e ela roda uma vez.
// auth.protect() manda quem não tem sessão para o login em toda página e layout que
// lê dados por aqui (a checagem por recurso que o Clerk 7 recomenda no lugar do
// createRouteMatcher no proxy). O protectedProcedure continua como segunda porta.
const caller = cache(async () => {
  const { userId } = await auth.protect();
  return createCaller({ auth: { userId }, db });
});

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
