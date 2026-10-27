import type { Database } from "@cursos/db";
import { PERFIS } from "@cursos/db/schema/formatos";
import { perfilDaPessoa, pontoLancamento } from "@cursos/db/schema/index";
import { count } from "drizzle-orm";

import { type Perfil, perfilDoCadastro } from "../dominio/perfil";
import type { ContagemPorPerfil, LinhaDoPerfil } from "../dominio/pessoas";
import { BONUS_DE_FUNCIONARIO } from "../dominio/regras";
import type { AdminId, Conta } from "../dominio/tipos";
import type { Transacao } from "./comum";
import { type AlunoTravado, comAlunoTravado } from "./trava";

async function lerPerfil(db: Database, userId: string): Promise<Perfil | null> {
  const linha = await db.query.perfilDaPessoa.findFirst({
    columns: { perfil: true },
    where: { userId },
  });
  return linha?.perfil ?? null;
}

/**
 * Único escritor do lançamento `bonus_funcionario`: quem vira Funcionário ganha
 * BONUS_DE_FUNCIONARIO pontos, uma vez por pessoa, para sempre. Roda na transação
 * que grava o perfil. O índice ponto_bonus_funcionario_uma_vez segura o "uma vez",
 * e o on conflict do nothing faz da repetição um no-op: devolve se o bônus nasceu.
 * Uma transição gravada a partir deste código dá o bônus. Quem já era
 * Funcionário antes dele ganha pela virada (darBonusDaVirada).
 */
async function darBonusDeFuncionario(
  tx: Transacao,
  userId: string,
  agora?: Date
): Promise<boolean> {
  const [novo] = await tx
    .insert(pontoLancamento)
    .values({
      criadoEm: agora,
      motivo: "bonus_funcionario",
      pontos: BONUS_DE_FUNCIONARIO,
      userId,
    })
    .onConflictDoNothing()
    .returning({ id: pontoLancamento.id });
  return novo !== undefined;
}

/**
 * O bônus de quem já era Funcionário antes do bônus existir, pela virada
 * (scripts/virada-dos-pontos.ts), com o aluno travado. Devolve se nasceu.
 */
export function darBonusDaVirada(
  aluno: AlunoTravado,
  agora: Date
): Promise<boolean> {
  return darBonusDeFuncionario(aluno.tx, aluno.userId, agora);
}

/**
 * O perfil de quem está no app. No primeiro acesso, a linha nasce com o perfil do
 * cadastro, e só aí a conta é lida no Clerk. Dois primeiros acessos ao mesmo
 * tempo gravam uma linha só, e os dois leem a que ficou. Com o Clerk fora, o
 * pedido vale como Público aberto, o perfil de menos acesso, e nada se grava:
 * o acesso seguinte lê a conta de novo. A linha que nasce Funcionário leva o
 * bônus na mesma transação.
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
  let conta: Conta | null;
  try {
    conta = await lerConta();
  } catch (erro) {
    console.warn(
      `perfil de ${userId}: o Clerk não respondeu no primeiro acesso`,
      erro
    );
    return perfilDoCadastro(null);
  }
  const nova = await db.transaction(async (tx) => {
    const [linha] = await tx
      .insert(perfilDaPessoa)
      .values({ perfil: perfilDoCadastro(conta), userId })
      .onConflictDoNothing()
      .returning({ perfil: perfilDaPessoa.perfil });
    if (linha?.perfil === "funcionario") {
      await darBonusDeFuncionario(tx, userId);
    }
    return linha;
  });
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
 * do que ele pode ver: uma troca do mesmo aluno espera e lê o perfil novo. A
 * mudança para Funcionário de quem não era dá o bônus, se ele ainda não nasceu;
 * `bonus` diz se nasceu nesta mudança.
 */
export function definirPerfil(
  db: Database,
  admin: AdminId,
  userId: string,
  perfil: Perfil,
  agora: Date
): Promise<{ bonus: boolean }> {
  return comAlunoTravado(db, userId, async (aluno) => {
    // Depois da trava, num statement próprio: lê o que a outra mudança comitou.
    const antes = await aluno.tx.query.perfilDaPessoa.findFirst({
      columns: { perfil: true },
      where: { userId: aluno.userId },
    });
    await aluno.tx
      .insert(perfilDaPessoa)
      .values({ definidoEm: agora, definidoPor: admin, perfil, userId })
      .onConflictDoUpdate({
        set: { definidoEm: agora, definidoPor: admin, perfil },
        target: perfilDaPessoa.userId,
      });
    const virou = perfil === "funcionario" && antes?.perfil !== "funcionario";
    return {
      bonus:
        virou && (await darBonusDeFuncionario(aluno.tx, aluno.userId, agora)),
    };
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
