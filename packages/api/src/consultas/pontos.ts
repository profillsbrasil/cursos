import type { Database } from "@cursos/db";
import { pontoLancamento } from "@cursos/db/schema/index";
import { eq, sql } from "drizzle-orm";

import type { LinhaDoExtrato } from "../dominio/pontos";
import type { DiaISO } from "../dominio/tipos";
import type { Executor, Transacao } from "./comum";

const FUSO = "America/Sao_Paulo";

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

async function saldoDe(exec: Executor, userId: string): Promise<number> {
  const [linha] = await exec
    .select({
      saldo: sql<number>`coalesce(sum(${pontoLancamento.pontos}), 0)::int`,
    })
    .from(pontoLancamento)
    .where(eq(pontoLancamento.userId, userId));
  return linha?.saldo ?? 0;
}

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
        with: { curso: { columns: { titulo: true } } },
      },
      trilha: { columns: { titulo: true } },
    },
  });
}

declare const travada: unique symbol;
export type TransacaoTravada = Transacao & { readonly [travada]: true };

/**
 * Abre a transação, trava o aluno e só então lê o saldo, num statement separado:
 * em READ COMMITTED o snapshot de um statement nasce antes de ele esperar a trava,
 * e a soma no mesmo statement leria o saldo de antes da troca que segurava a trava.
 */
export function comSaldoTravado<T>(
  db: Database,
  userId: string,
  fn: (tx: TransacaoTravada, saldo: number) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`ponto:${userId}`}, 0))`
    );
    return fn(tx as TransacaoTravada, await saldoDe(tx, userId));
  });
}
