import type { Database } from "@cursos/db";
import { sql } from "drizzle-orm";

import type { CursoId } from "../dominio/tipos";
import type { Transacao } from "./comum";

/**
 * `ponto:<userId>` trava o aluno: todo débito de pontos e toda escrita de liberação.
 * O crédito de aula.registrar não trava: ele só soma e não deixa o saldo negativo.
 * `curso:<id>` e `trilha:<id>` serializam a edição e o apagamento pelo admin.
 *
 * Ordem, que não deixa ciclo: `trilha:<id>` antes de qualquer `curso:<id>`; várias
 * `curso:<id>` só por travarCursos, em ordem de id; salvarCurso e apagarCurso pegam
 * só a `curso:<id>` deles. Ninguém pede `trilha:` segurando `curso:`.
 */
type ChaveDeTrava = `ponto:${string}` | `curso:${string}` | `trilha:${string}`;

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

/**
 * Trava `curso:<id>` de cada curso, sem repetir, em ordem de id e num statement,
 * dentro da transação de quem chama. O `order by n` fixa a ordem das chamadas
 * (medido no Postgres 17.11). A lista vai como literal de array: um array do
 * drizzle em `sql` vira `($1, $2)`, que o cast para text[] recusa.
 */
export async function travarCursos(
  tx: Transacao,
  ids: Iterable<CursoId>
): Promise<void> {
  const chaves = [...new Set(ids)]
    .sort()
    .map((id) => `curso:${id}` satisfies ChaveDeTrava);
  if (chaves.length === 0) {
    return;
  }
  await tx.execute(sql`
    select pg_advisory_xact_lock(hashtextextended(chave, 0))
    from unnest(${`{${chaves.join(",")}}`}::text[]) with ordinality as t(chave, n)
    order by n`);
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
