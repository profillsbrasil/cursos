// O Clerk é a tabela de usuários. O tipo User do SDK não sai deste arquivo: o
// resto do código vê Pessoa.

import type { ClerkClient, User } from "@clerk/backend";

import type { Pessoa, ResultadoDaBusca } from "../dominio/tipos";

export interface Pessoas {
  /**
   * Casa nome, sobrenome, e-mail, telefone, username e userId, por trecho, e
   * devolve até LIMITE pessoas. Termo vazio lista as pessoas ativas mais
   * recentes, para a tela abrir com alguém.
   */
  buscar: (termo: string) => Promise<ResultadoDaBusca>;
  /** null quando o Clerk não conhece o userId. */
  porId: (userId: string) => Promise<Pessoa | null>;
}

export const LIMITE = 20;

export function paraPessoa(u: User): Pessoa {
  const email = u.primaryEmailAddress?.emailAddress ?? null;
  return {
    email,
    foto: u.hasImage ? u.imageUrl : null,
    nome: u.fullName ?? u.username ?? email ?? u.id,
    userId: u.id,
  };
}

export function pessoasDoClerk(clerk: ClerkClient): Pessoas {
  return {
    async buscar(termo) {
      const r = await clerk.users.getUserList(
        termo
          ? { limit: LIMITE, query: termo }
          : { limit: LIMITE, orderBy: "-last_active_at" }
      );
      return { pessoas: r.data.map(paraPessoa), total: r.totalCount };
    },
    // A lista filtrada por userId devolve vazio para quem não existe; getUser
    // lançaria 404 e pediria tradução de erro.
    async porId(userId) {
      const r = await clerk.users.getUserList({ limit: 1, userId: [userId] });
      const [u] = r.data;
      return u ? paraPessoa(u) : null;
    },
  };
}
