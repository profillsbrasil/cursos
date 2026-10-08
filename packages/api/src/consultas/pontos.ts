import type { Database } from "@cursos/db";
import { pontoLancamento } from "@cursos/db/schema/index";
import { eq, sql } from "drizzle-orm";

import type { LinhaDoExtrato } from "../dominio/pontos";
import type { DiaISO } from "../dominio/tipos";
import type { Executor } from "./comum";
import { type AlunoTravado, comAlunoTravado } from "./trava";

const FUSO = "America/Sao_Paulo";

export async function linhasDoSaldo(
  exec: Executor,
  userId: string,
  segunda: DiaISO
): Promise<{ saldo: number; entradasDaSemana: number }> {
  const [linha] = await exec
    .select({
      entradasDaSemana: sql<number>`coalesce(sum(${pontoLancamento.pontos}) filter (
          where ${pontoLancamento.pontos} > 0
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

/**
 * Trava o aluno e só então lê o saldo, num statement separado (ver comAlunoTravado).
 * Todo débito passa por aqui, por convenção: o tipo não garante, porque
 * comAlunoTravado também entrega um AlunoTravado, sem saldo lido.
 */
export function comSaldoTravado<T>(
  db: Database,
  userId: string,
  fn: (aluno: AlunoTravado, saldo: number) => Promise<T>
): Promise<T> {
  return comAlunoTravado(db, userId, async (aluno) =>
    fn(aluno, await saldoDe(aluno.tx, aluno.userId))
  );
}
