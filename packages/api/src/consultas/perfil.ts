import type { Database } from "@cursos/db";
import { perfilDaPessoa } from "@cursos/db/schema/index";

import { type Perfil, perfilDoCadastro } from "../dominio/perfil";
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
