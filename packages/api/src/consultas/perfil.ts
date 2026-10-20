import type { Database } from "@cursos/db";
import { PERFIS } from "@cursos/db/schema/formatos";
import { perfilDaPessoa } from "@cursos/db/schema/index";
import { count } from "drizzle-orm";

import { type Perfil, perfilDoCadastro } from "../dominio/perfil";
import type { ContagemPorPerfil, LinhaDoPerfil } from "../dominio/pessoas";
import type { AdminId, Conta } from "../dominio/tipos";
import { comAlunoTravado } from "./trava";

async function lerPerfil(db: Database, userId: string): Promise<Perfil | null> {
  const linha = await db.query.perfilDaPessoa.findFirst({
    columns: { perfil: true },
    where: { userId },
  });
  return linha?.perfil ?? null;
}

/**
 * O perfil de quem está no app. No primeiro acesso, a linha nasce com o perfil do
 * cadastro, e só aí a conta é lida no Clerk. Dois primeiros acessos ao mesmo
 * tempo gravam uma linha só, e os dois leem a que ficou.
 */
export async function perfilDe(
  db: Database,
  userId: string,
  lerConta: () => Promise<Conta | null>
): Promise<Perfil> {
  const lido = await lerPerfil(db, userId);
  if (lido) {
    return lido;
  }
  const [nova] = await db
    .insert(perfilDaPessoa)
    .values({ perfil: perfilDoCadastro(await lerConta()), userId })
    .onConflictDoNothing()
    .returning({ perfil: perfilDaPessoa.perfil });
  if (nova) {
    return nova.perfil;
  }
  const outra = await lerPerfil(db, userId);
  if (!outra) {
    throw new Error(`O perfil de ${userId} não ficou gravado.`);
  }
  return outra;
}

/**
 * Único UPDATE de perfil_da_pessoa. Grava com o aluno travado, como toda mudança
 * do que ele pode ver: uma troca do mesmo aluno espera e lê o perfil novo.
 */
export async function definirPerfil(
  db: Database,
  admin: AdminId,
  userId: string,
  perfil: Perfil,
  agora: Date
): Promise<void> {
  await comAlunoTravado(db, userId, async (aluno) => {
    await aluno.tx
      .insert(perfilDaPessoa)
      .values({ definidoEm: agora, definidoPor: admin, perfil, userId })
      .onConflictDoUpdate({
        set: { definidoEm: agora, definidoPor: admin, perfil },
        target: perfilDaPessoa.userId,
      });
  });
}

/** As linhas de perfil desses userIds; quem ainda não entrou no app não tem. */
export function linhasDosPerfis(
  db: Database,
  userIds: readonly string[]
): Promise<LinhaDoPerfil[]> {
  if (userIds.length === 0) {
    return Promise.resolve([]);
  }
  return db.query.perfilDaPessoa.findMany({
    where: { userId: { in: [...userIds] } },
  });
}

/** Quem tem o perfil, da mudança mais recente para a mais antiga. */
export async function quemTemOPerfil(
  db: Database,
  perfil: Perfil,
  limite: number
): Promise<string[]> {
  const linhas = await db.query.perfilDaPessoa.findMany({
    columns: { userId: true },
    limit: limite,
    orderBy: { definidoEm: "desc", userId: "asc" },
    where: { perfil },
  });
  return linhas.map((l) => l.userId);
}

export async function contagemPorPerfil(
  db: Database
): Promise<ContagemPorPerfil> {
  const linhas = await db
    .select({ n: count(), perfil: perfilDaPessoa.perfil })
    .from(perfilDaPessoa)
    .groupBy(perfilDaPessoa.perfil);
  const contagem = Object.fromEntries(
    PERFIS.map((p) => [p, 0])
  ) as ContagemPorPerfil;
  for (const l of linhas) {
    contagem[l.perfil] = l.n;
  }
  return contagem;
}
