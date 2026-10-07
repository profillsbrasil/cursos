import type { Database } from "@cursos/db";
import { pontoLancamento } from "@cursos/db/schema/index";
import { eq, sql } from "drizzle-orm";

import type { LinhaDoExtrato } from "../dominio/pontos";
import { diaLocal, segundaDaSemana } from "../dominio/sequencia";
import type { DiaISO } from "../dominio/tipos";

export type Transacao = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Executor = Database | Transacao;

const FUSO = "America/Sao_Paulo";

/**
 * Saldo = soma de tudo. Semana = só entradas desde segunda 00:00 de São Paulo, para a
 * troca não virar "-800 nesta semana". O filtro usa o índice (user_id, criado_em).
 */
export async function linhasDoSaldo(
  exec: Executor,
  userId: string,
  segunda: DiaISO
): Promise<{ saldo: number; semana: number }> {
  const [linha] = await exec
    .select({
      saldo: sql<number>`coalesce(sum(${pontoLancamento.pontos}), 0)::int`,
      semana: sql<number>`coalesce(sum(${pontoLancamento.pontos}) filter (
          where ${pontoLancamento.pontos} > 0
            and ${pontoLancamento.criadoEm} >= (${segunda}::date)::timestamp at time zone ${FUSO}), 0)::int`,
    })
    .from(pontoLancamento)
    .where(eq(pontoLancamento.userId, userId));
  if (!linha) {
    throw new Error("A soma sem group by não devolveu a linha.");
  }
  return linha;
}

/** Os `limite` lançamentos mais recentes, com o fato de cada um. */
export function linhasDoExtrato(
  exec: Executor,
  userId: string,
  limite: number
): Promise<LinhaDoExtrato[]> {
  return exec.query.pontoLancamento.findMany({
    columns: { criadoEm: true, id: true, motivo: true, pontos: true },
    limit: limite,
    orderBy: { criadoEm: "desc", id: "desc" },
    where: { userId },
    with: {
      aula: { columns: { titulo: true } },
      curso: { columns: { titulo: true } },
      liberacao: {
        columns: {},
        with: { curso: { columns: { slug: true, titulo: true } } },
      },
      trilha: { columns: { titulo: true } },
    },
  });
}

declare const travada: unique symbol;
/** Transação que já segura a trava de pontos do aluno. Só comSaldoTravado cria uma. */
export type TransacaoTravada = Transacao & { readonly [travada]: true };

/**
 * Única porta para tirar pontos de um aluno. Abre a transação, trava o aluno e só
 * então lê o saldo, num statement separado: em READ COMMITTED o snapshot de um
 * statement nasce antes de ele esperar a trava, e a soma no mesmo statement leria o
 * saldo de antes da troca que segurava a trava. Débitos do mesmo aluno rodam em fila.
 * Crédito não pega a trava: só aumenta o saldo, e quem não o viu vê saldo menor.
 */
export function comSaldoTravado<T>(
  db: Database,
  userId: string,
  agora: Date,
  fn: (tx: TransacaoTravada, saldo: number) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`ponto:${userId}`}, 0))`
    );
    const { saldo } = await linhasDoSaldo(
      tx,
      userId,
      segundaDaSemana(diaLocal(agora))
    );
    return fn(tx as TransacaoTravada, saldo);
  });
}
