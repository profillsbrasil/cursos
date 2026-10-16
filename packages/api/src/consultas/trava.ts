import type { Database } from "@cursos/db";
import { sql } from "drizzle-orm";

import type { Transacao } from "./comum";

/**
 * `ponto:<userId>` trava o aluno: todo débito de pontos e toda escrita de liberação.
 * O crédito de aula.registrar não trava: ele só soma e não deixa o saldo negativo.
 * `curso:<id>` serializa a edição e o apagamento pelo admin. salvarCurso e
 * apagarCurso pegam só a `curso:<id>` deles, e a criação pega também a
 * `slug:<raiz>` (raizDoSlug) antes de escolher o endereço livre.
 */
type ChaveDeTrava = `ponto:${string}` | `curso:${string}` | `slug:${string}`;

/** A mesma trava de comTrava, numa transação que já segura outra. */
export async function travarTambem(tx: Transacao, chave: ChaveDeTrava) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${chave}, 0))`
  );
}

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
    await travarTambem(tx, chave);
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

/** A trava do aluno numa transação que já está aberta (o registrar, a edição do admin). */
export async function travarAluno(
  tx: Transacao,
  userId: string
): Promise<AlunoTravado> {
  await travarTambem(tx, `ponto:${userId}`);
  return { tx, userId } as AlunoTravado;
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
  return db.transaction(async (tx) => fn(await travarAluno(tx, userId)));
}
