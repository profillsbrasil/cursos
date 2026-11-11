import type { Database } from "@cursos/db";
import { PERFIS } from "@cursos/db/schema/formatos";
import { perfilDaPessoa, pontoLancamento } from "@cursos/db/schema/index";
import { count, sql } from "drizzle-orm";

import { type ConviteAceito, lerEmail } from "../dominio/convite";
import { type Perfil, perfilDoCadastro } from "../dominio/perfil";
import type { ContagemPorPerfil, LinhaDoPerfil } from "../dominio/pessoas";
import { BONUS_DE_FUNCIONARIO } from "../dominio/regras";
import type { AdminId, Conta } from "../dominio/tipos";
import type { Pessoas } from "../externos/pessoas";
import type { Executor, Transacao } from "./comum";
import { aplicarPapelDoConvite, reivindicarConvite } from "./convite";
import { liberarNoAlunoTravado } from "./liberacao";
import { type AlunoTravado, comAlunoTravado } from "./trava";

async function lerPerfil(
  exec: Executor,
  userId: string
): Promise<Perfil | null> {
  const linha = await exec.query.perfilDaPessoa.findFirst({
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

interface Chegada {
  /** Há convite de admin aceito por esta pessoa que o Clerk ainda não gravou. */
  papelPorAplicar: boolean;
  perfil: Perfil;
}

/**
 * A linha do perfil e, na mesma ida, se há papel de convite por aplicar. É o
 * statement de todo pedido do aluno: o exists é uma sonda no índice
 * convite_aceito_por_unico.
 */
async function lerChegada(
  db: Database,
  userId: string
): Promise<Chegada | null> {
  const {
    rows: [linha],
  } = await db.execute<{
    papel_por_aplicar: boolean;
    perfil: Perfil;
  }>(sql`
    select p.perfil,
           exists (select 1 from convite c
                    where c.aceito_por = p.user_id and c.como_admin
                      and c.papel_aplicado_em is null) as papel_por_aplicar
      from perfil_da_pessoa p
     where p.user_id = ${userId}`);
  return linha
    ? { papelPorAplicar: linha.papel_por_aplicar, perfil: linha.perfil }
    : null;
}

/** O curso que sumiu (null) fica de fora, e a chegada libera os outros. */
async function liberarOsCursosDoConvite(
  aluno: AlunoTravado,
  convite: ConviteAceito,
  agora: Date
): Promise<void> {
  for (const cursoId of convite.cursoIds) {
    // biome-ignore lint/performance/noAwaitInLoops: a transação tem um client só.
    await liberarNoAlunoTravado(aluno, convite.convidadoPor, cursoId, agora);
  }
}

/** A falha do Clerk aqui tira poder, nunca dá: a pessoa segue aluno, e o pedido seguinte tenta de novo. */
async function tentarOPapelDoConvite(
  db: Database,
  pessoas: Pick<Pessoas, "definirPapel">,
  userId: string,
  agora: Date
): Promise<void> {
  try {
    await aplicarPapelDoConvite(db, pessoas, userId, agora);
  } catch (erro) {
    console.warn(
      `papel de ${userId}: o convite dá admin, e o Clerk ainda não gravou`,
      erro
    );
  }
}

/**
 * O perfil de quem está no app. No primeiro acesso, com o aluno travado e numa
 * transação: reivindica o convite do e-mail principal verificado, grava a linha
 * com o perfil do convite (ou o do cadastro), dá o bônus de quem nasce
 * Funcionário e libera os cursos do convite. Dois primeiros acessos ao mesmo
 * tempo esperam a trava, e o segundo lê a linha que o primeiro gravou. O papel
 * de admin do convite vai ao Clerk depois do commit, e todo pedido seguinte
 * tenta de novo enquanto ele não foi gravado. Com o Clerk fora na leitura da
 * conta, o pedido vale como Público aberto, o perfil de menos acesso, e nada se
 * grava: o acesso seguinte lê a conta de novo.
 */
export async function perfilDe(
  db: Database,
  userId: string,
  pessoas: Pick<Pessoas, "conta" | "definirPapel">,
  agora: Date
): Promise<Perfil> {
  const lido = await lerChegada(db, userId);
  if (lido) {
    if (lido.papelPorAplicar) {
      await tentarOPapelDoConvite(db, pessoas, userId, agora);
    }
    return lido.perfil;
  }
  let conta: Conta | null;
  try {
    conta = await pessoas.conta(userId);
  } catch (erro) {
    console.warn(
      `perfil de ${userId}: o Clerk não respondeu no primeiro acesso`,
      erro
    );
    return perfilDoCadastro(null);
  }
  const chegada = await comAlunoTravado(db, userId, async (aluno) => {
    // Depois da trava, num statement próprio: outro pedido já gravou a linha?
    const ja = await lerPerfil(aluno.tx, userId);
    if (ja) {
      return { papelPorAplicar: false, perfil: ja };
    }
    const email =
      conta?.emailVerificado && conta.email ? lerEmail(conta.email) : null;
    const convite = email
      ? await reivindicarConvite(aluno, email, agora)
      : null;
    const perfil = convite?.perfil ?? perfilDoCadastro(conta);
    await aluno.tx.insert(perfilDaPessoa).values({
      definidoEm: agora,
      definidoPor: convite?.convidadoPor ?? null,
      perfil,
      userId,
    });
    if (perfil === "funcionario") {
      await darBonusDeFuncionario(aluno.tx, userId, agora);
    }
    if (convite) {
      await liberarOsCursosDoConvite(aluno, convite, agora);
    }
    return { papelPorAplicar: convite?.comoAdmin ?? false, perfil };
  });
  if (chegada.papelPorAplicar) {
    await tentarOPapelDoConvite(db, pessoas, userId, agora);
  }
  return chegada.perfil;
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
