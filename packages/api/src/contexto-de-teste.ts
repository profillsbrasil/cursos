import type { Database } from "@cursos/db";

import type { Context, Papel } from "./context";

export interface OpcoesDeTeste {
  db: Database;
  papel?: Papel;
  /** null: sem sessão. */
  userId: string | null;
}

/** Context dos testes. Quando Servicos ganha um campo, só este arquivo muda nos testes. */
export function contextoDeTeste(o: OpcoesDeTeste): Context {
  return {
    auth: o.userId ? { papel: o.papel ?? "aluno", userId: o.userId } : null,
    db: o.db,
  };
}
