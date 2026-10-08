import type { Database } from "@cursos/db";

import type { Context, Papel } from "./context";
import type { Pessoa } from "./dominio/tipos";
import { type Capas, capasDesligadas } from "./externos/capas";
import { LIMITE, type Pessoas } from "./externos/pessoas";
import { sessaoDe } from "./sessao";

export interface OpcoesDeTeste {
  /** Sem a porta, o envio de capa recusa como num ambiente sem Storage. */
  capas?: Capas;
  db: Database;
  papel?: Papel;
  /** As pessoas que o Clerk falso conhece. Sem a lista, ele não conhece ninguém. */
  pessoas?: readonly Pessoa[];
  /** null: sem sessão. */
  userId: string | null;
}

/** Clerk falso: busca por trecho de nome, e-mail ou userId, sem caixa, e corta em LIMITE. */
export function pessoasDeTeste(lista: readonly Pessoa[]): Pessoas {
  return {
    buscar: (termo) => {
      const t = termo.toLowerCase();
      const casadas = lista.filter((p) =>
        [p.nome, p.email ?? "", p.userId].some((campo) =>
          campo.toLowerCase().includes(t)
        )
      );
      return Promise.resolve({
        pessoas: casadas.slice(0, LIMITE),
        total: casadas.length,
      });
    },
    porId: (userId) =>
      Promise.resolve(lista.find((p) => p.userId === userId) ?? null),
  };
}

/** Context dos testes. Quando Servicos ganha um campo, só este arquivo muda nos testes. */
export function contextoDeTeste(o: OpcoesDeTeste): Context {
  return {
    auth: o.userId ? sessaoDe(o.papel ?? "aluno", o.userId) : null,
    capas: o.capas ?? capasDesligadas,
    db: o.db,
    pessoas: pessoasDeTeste(o.pessoas ?? []),
  };
}
