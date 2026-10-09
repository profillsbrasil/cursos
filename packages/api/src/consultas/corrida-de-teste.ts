// Ajudantes dos testes de corrida: param cada lado num ponto conhecido do banco,
// sem mexer no código que se testa. Só os *.integration.test.ts importam daqui.

import { setTimeout as esperar } from "node:timers/promises";
import type { Database } from "@cursos/db";
import { sql } from "drizzle-orm";

/**
 * Segura um SHARE lock na tabela numa transação à parte: todo INSERT, UPDATE e
 * DELETE nela espera até soltar().
 */
export async function seguraATabela(
  db: Database,
  tabela: "liberacao" | "trilha_curso"
): Promise<() => Promise<void>> {
  let soltar: () => void = () => undefined;
  const portao = new Promise<void>((r) => {
    soltar = r;
  });
  let travou: () => void = () => undefined;
  const travada = new Promise<void>((r) => {
    travou = r;
  });
  const transacao = db.transaction(async (tx) => {
    await tx.execute(sql.raw(`lock table ${tabela} in share mode`));
    travou();
    await portao;
  });
  await travada;
  return async () => {
    soltar();
    await transacao;
  };
}

/**
 * Espera até `n` statements que começam por um dos `comecos` pararem em lock, e
 * devolve o tipo de espera de cada um, em ordem: 'advisory' é uma trava por chave,
 * 'relation' é o statement parado no SHARE lock de seguraATabela. O começo
 * ignora os espaços e quebras de linha do início do SQL.
 */
export async function esperas(
  db: Database,
  n: number,
  comecos: readonly string[],
  tentativas = 150
): Promise<string[]> {
  const { rows } = await db.execute<{ e: string; q: string }>(sql`
    select wait_event as e, query as q from pg_stat_activity
    where datname = current_database() and wait_event_type = 'Lock'`);
  const paradas = rows.filter((r) =>
    comecos.some((c) => r.q.trimStart().startsWith(c))
  );
  if (paradas.length >= n) {
    return paradas.map((r) => r.e).sort();
  }
  if (tentativas === 0) {
    throw new Error(`Só ${paradas.length} de ${n} statements pararam em lock.`);
  }
  await esperar(20);
  return esperas(db, n, comecos, tentativas - 1);
}
