import "server-only";

import { auth } from "@clerk/nextjs/server";
import { contextoDe, ehAdmin } from "@cursos/api/context";
import { TIPOS_DE_MATERIAL } from "@cursos/api/dominio/material";
import type { Perfil } from "@cursos/api/dominio/perfil";
import { createCaller } from "@cursos/api/routers/index";
import { notFound, unstable_rethrow } from "next/navigation";
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

/** Para o menu da conta do aluno mostrar o link da área do admin. */
export const souAdmin = cache(async () => ehAdmin((await contexto()).auth));

export const carregarPainel = cache(async () =>
  (await caller()).meusCursos.painel()
);

export const carregarResumo = cache(async () =>
  (await caller()).aluno.resumo()
);

/**
 * Dado acessório da casca (o placar do cartão de conta, o Continuar do aluno). A
 * casca mora no layout, e um erro de layout troca a casca inteira pela tela de erro
 * da raiz. Assim a falha tira só a peça: o erro vai ao log do servidor e a Promise
 * resolve null, enquanto a página, que lê o próprio dado, mostra o erro dela dentro
 * da casca. redirect e notFound passam por unstable_rethrow.
 */
export function paraACasca<T>(
  peca: "continuar" | "placar",
  carregar: Promise<T>
): Promise<T | null> {
  return carregar.catch((erro: unknown) => {
    unstable_rethrow(erro);
    console.error(`casca: ${peca} não carregou`, erro);
    return null;
  });
}

export const carregarConquistas = cache(async () =>
  (await caller()).aluno.conquistas()
);

export const carregarComunicadosDoAluno = cache(async () =>
  (await caller()).aluno.comunicados()
);

export const carregarAula = cache(async (slug: string, aulaId: string) =>
  (await caller()).aula.abrir({ aulaId, slug })
);

export const carregarPaginaDoCurso = cache(async (slug: string) =>
  (await caller()).curso.pagina({ slug })
);

export const carregarPaginaDoCertificado = cache(async (slug: string) =>
  (await caller()).certificado.pagina({ slug })
);

export const conferirCertificado = cache((codigo: string) =>
  createCaller(contextoDe(null, servicos)).certificado.conferir({ codigo })
);

/** Pública como a conferência: a capa aparece para quem ainda não entrou. */
export const abrirCapa = (chave: string) => servicos.capas.abrir(chave);

/**
 * O download do material de apoio. Sem sessão não manda para o login: a rota
 * responde 404, como para quem não pode ver o curso. null também quando o objeto
 * sumiu do bucket.
 */
export async function abrirMaterial(id: string) {
  const ctx = contextoDe(await auth(), servicos);
  if (!ctx.auth) {
    return null;
  }
  const arquivo = await createCaller(ctx).curso.material({ id });
  const resposta = arquivo && (await servicos.materiais.abrir(arquivo.chave));
  return arquivo && resposta
    ? {
        contentType: TIPOS_DE_MATERIAL[arquivo.tipo].contentType,
        nomeDoArquivo: arquivo.nomeDoArquivo,
        resposta,
      }
    : null;
}

export const carregarPainelDeTroca = cache(async () =>
  (await caller()).troca.painel()
);

/** Só Meus cursos: o botão de Sua semana. Trocar pontos lê o fato do painel. */
export const carregarTemCursoTrocavelNaVitrine = cache(async () =>
  (await caller()).troca.temCursoTrocavelNaVitrine()
);

export const carregarCatalogo = cache(async () =>
  (await exigirAdmin()).admin.catalogo.visao()
);

export const carregarCurso = cache(async (id: string) =>
  (await exigirAdmin()).admin.catalogo.abrirCurso({ id })
);

export const carregarCategorias = cache(async () =>
  (await exigirAdmin()).admin.categorias.lista()
);

export const carregarPessoas = cache(async (termo: string) =>
  (await exigirAdmin()).admin.liberacoes.buscar({ termo })
);

export const carregarListaDePessoas = cache(
  async (termo: string, perfil: Perfil | null) =>
    (await exigirAdmin()).admin.pessoas.lista({ perfil, termo })
);

/** null: userId fora do formato, ou que o Clerk não conhece. */
export const carregarFichaDaPessoa = cache(async (userId: string) =>
  (await exigirAdmin()).admin.pessoas.ficha({ userId })
);

/** null: userId fora do formato, ou userId que o Clerk não conhece e que nunca teve liberação. */
export const carregarAcessoDoAluno = cache(async (userId: string) =>
  (await exigirAdmin()).admin.liberacoes.acesso({ userId })
);

export const carregarGradeDosPerfis = cache(async () =>
  (await exigirAdmin()).admin.perfis.grade()
);

export const carregarComunicados = cache(async () =>
  (await exigirAdmin()).admin.comunicados.lista()
);
