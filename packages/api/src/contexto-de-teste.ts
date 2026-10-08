import type { Database } from "@cursos/db";

import type { Context, Papel } from "./context";
import { type Capas, capasDesligadas } from "./externos/capas";
import { sessaoDe } from "./sessao";

export interface OpcoesDeTeste {
  /** Sem a porta, o envio de capa recusa como num ambiente sem Storage. */
  capas?: Capas;
  db: Database;
  papel?: Papel;
  /** null: sem sessão. */
  userId: string | null;
}

/** Context dos testes. Quando Servicos ganha um campo, só este arquivo muda nos testes. */
export function contextoDeTeste(o: OpcoesDeTeste): Context {
  return {
    auth: o.userId ? sessaoDe(o.papel ?? "aluno", o.userId) : null,
    capas: o.capas ?? capasDesligadas,
    db: o.db,
  };
}
