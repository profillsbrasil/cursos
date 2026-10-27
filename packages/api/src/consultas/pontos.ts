import type { Database } from "@cursos/db";
import { pontoLancamento } from "@cursos/db/schema/index";
import { and, eq, gt, inArray, sql } from "drizzle-orm";

import type { SaldoDaPessoa } from "../dominio/pessoas";
import {
  FORA_DOS_PONTOS_DA_SEMANA,
  type LinhaDoExtrato,
} from "../dominio/pontos";
import type { DiaISO } from "../dominio/tipos";
import type { Executor } from "./comum";
import { type AlunoTravado, comAlunoTravado } from "./trava";

const FUSO = "America/Sao_Paulo";

const FORA_DA_SEMANA = sql`(${sql.join(
  FORA_DOS_PONTOS_DA_SEMANA.map((m) => sql`${m}`),
  sql`, `
)})`;

/**
 * O saldo e as entradas da semana. A concessão do admin e o bônus de funcionário
 * entram no saldo, mas não na semana: os pontos da semana medem estudo
 * (FORA_DOS_PONTOS_DA_SEMANA).
 */
export async function linhasDoSaldo(
  exec: Executor,
  userId: string,
  segunda: DiaISO
): Promise<{ saldo: number; entradasDaSemana: number }> {
  const [linha] = await exec
    .select({
      entradasDaSemana: sql<number>`coalesce(sum(${pontoLancamento.pontos}) filter (
          where ${pontoLancamento.pontos} > 0
            and ${pontoLancamento.motivo} not in ${FORA_DA_SEMANA}
            and ${pontoLancamento.criadoEm} >= (${segunda}::date)::timestamp at time zone ${FUSO}), 0)::int`,
      saldo: sql<number>`coalesce(sum(${pontoLancamento.pontos}), 0)::int`,
    })
    .from(pontoLancamento)
    .where(eq(pontoLancamento.userId, userId));
  if (!linha) {
    throw new Error("A soma sem group by não devolveu a linha.");
  }
  return linha;
}

/**
 * As entradas de estudo somadas por dia de São Paulo, para Mil pontos estudando:
 * os lançamentos positivos fora de FORA_DOS_PONTOS_DA_SEMANA, os mesmos que os
 * pontos da semana contam.
 */
export function estudoPorDia(
  exec: Executor,
  userId: string
): Promise<{ dia: string; pontos: number }[]> {
  // O fuso entra como literal: com parâmetro, o select e o group by teriam $1 e
  // $2, e o Postgres não os reconhece como a mesma expressão.
  const dia = sql<string>`to_char(${pontoLancamento.criadoEm} at time zone ${sql.raw(`'${FUSO}'`)}, 'YYYY-MM-DD')`;
  return exec
    .select({ dia, pontos: sql<number>`sum(${pontoLancamento.pontos})::int` })
    .from(pontoLancamento)
    .where(
      and(
        eq(pontoLancamento.userId, userId),
        gt(pontoLancamento.pontos, 0),
        sql`${pontoLancamento.motivo} not in ${FORA_DA_SEMANA}`
      )
    )
    .groupBy(dia);
}

/** Só o saldo, para a troca da amostra na página do curso e no player. */
export async function saldoDe(exec: Executor, userId: string): Promise<number> {
  const [linha] = await exec
    .select({
      saldo: sql<number>`coalesce(sum(${pontoLancamento.pontos}), 0)::int`,
    })
    .from(pontoLancamento)
    .where(eq(pontoLancamento.userId, userId));
  return linha?.saldo ?? 0;
}

/**
 * O saldo de cada userId numa consulta só, para a lista de Pessoas do admin.
 * Quem não tem lançamento não vem na resposta: o saldo dele é 0.
 */
export function saldosDe(
  exec: Executor,
  userIds: readonly string[]
): Promise<SaldoDaPessoa[]> {
  if (userIds.length === 0) {
    return Promise.resolve([]);
  }
  return exec
    .select({
      saldo: sql<number>`sum(${pontoLancamento.pontos})::int`,
      userId: pontoLancamento.userId,
    })
    .from(pontoLancamento)
    .where(inArray(pontoLancamento.userId, [...userIds]))
    .groupBy(pontoLancamento.userId);
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
      concessao: { columns: { motivo: true } },
      curso: { columns: { titulo: true } },
      liberacao: {
        columns: {},
        with: { curso: { columns: { titulo: true } } },
      },
      tentativa: {
        columns: {},
        with: { aula: { columns: { titulo: true } } },
      },
    },
  });
}

/**
 * Trava o aluno e só então lê o saldo, num statement separado (ver comAlunoTravado).
 * Todo débito passa por aqui, por convenção: o tipo não garante, porque
 * comAlunoTravado também entrega um AlunoTravado, sem saldo lido. A segunda
 * só existe porque linhasDoSaldo é a única leitura do saldo; o débito ignora
 * as entradas da semana.
 */
export function comSaldoTravado<T>(
  db: Database,
  userId: string,
  segunda: DiaISO,
  fn: (aluno: AlunoTravado, saldo: number) => Promise<T>
): Promise<T> {
  return comAlunoTravado(db, userId, async (aluno) => {
    const { saldo } = await linhasDoSaldo(aluno.tx, aluno.userId, segunda);
    return fn(aluno, saldo);
  });
}
