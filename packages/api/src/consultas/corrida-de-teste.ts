import { randomBytes } from "node:crypto";
import { setTimeout as esperar } from "node:timers/promises";
import type { Database } from "@cursos/db";
import { sql } from "drizzle-orm";

/**
 * A URL do banco de teste com um application_name só desta execução. esperas()
 * conta só as conexões com o mesmo nome: as do db que o teste criou com ela.
 */
export function urlDaCorrida(url: string): string {
  const u = new URL(url);
  u.searchParams.set(
    "application_name",
    `corrida-${randomBytes(4).toString("hex")}`
  );
  return u.toString();
}

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
 * ignora os espaços e quebras de linha do início do SQL. Só conta conexões com
 * o application_name do `db`: crie-o com urlDaCorrida.
 */
export async function esperas(
  db: Database,
  n: number,
  comecos: readonly string[],
  tentativas = 150
): Promise<string[]> {
  const { rows } = await db.execute<{ e: string; q: string }>(sql`
    select wait_event as e, query as q from pg_stat_activity
    where datname = current_database() and wait_event_type = 'Lock'
      and application_name = current_setting('application_name')`);
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
