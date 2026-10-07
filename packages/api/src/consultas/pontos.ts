import type { Database } from "@cursos/db";
import { pontoLancamento } from "@cursos/db/schema/index";
import { eq, sql } from "drizzle-orm";

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
