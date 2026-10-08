import type { Database } from "@cursos/db";
import { sql } from "drizzle-orm";

import type { Transacao } from "./comum";

/** `ponto:<userId>` trava o aluno: a troca e toda escrita de liberação. */
type ChaveDeTrava = `ponto:${string}`;

/**
 * Transação com pg_advisory_xact_lock na chave, solta no commit ou no rollback.
 * Trava por chave, e não FOR UPDATE, porque o que se disputa pode ainda não ter linha.
 */
export function comTrava<T>(
  db: Database,
  chave: ChaveDeTrava,
  fn: (tx: Transacao) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${chave}, 0))`
    );
    return fn(tx);
  });
}

declare const travado: unique symbol;

/**
 * Transação que segura a trava de um aluno, com o userId dele junto: quem recebe
 * um AlunoTravado grava para esse aluno e não para outro. Só comAlunoTravado cria um.
 */
export interface AlunoTravado {
  readonly tx: Transacao;
  readonly userId: string;
  readonly [travado]: true;
}

/**
 * Em READ COMMITTED o snapshot de um statement nasce antes de ele esperar a trava.
 * Leia o estado do aluno dentro de fn, num statement depois da trava, para ver o
 * que outra transação do mesmo aluno comitou enquanto esta esperava.
 */
export function comAlunoTravado<T>(
  db: Database,
  userId: string,
  fn: (aluno: AlunoTravado) => Promise<T>
): Promise<T> {
  return comTrava(db, `ponto:${userId}`, (tx) =>
    fn({ tx, userId } as AlunoTravado)
  );
}
