import type { Database } from "@cursos/db";
import { pontoLancamento } from "@cursos/db/schema/index";
import { eq, sql } from "drizzle-orm";

import type { LinhaDoExtrato } from "../dominio/pontos";
import type { DiaISO } from "../dominio/tipos";
import type { Executor } from "./comum";
import { type AlunoTravado, comAlunoTravado } from "./trava";

const FUSO = "America/Sao_Paulo";

/**
 * O saldo e as entradas da semana. A concessão do admin entra no saldo, mas não
 * na semana: os pontos da semana medem estudo.
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
            and ${pontoLancamento.motivo} <> 'concessao'
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
