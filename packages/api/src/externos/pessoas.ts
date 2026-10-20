// O Clerk é a tabela de usuários. O tipo User do SDK não sai deste arquivo: o
// resto do código vê Pessoa.

import type { ClerkClient, User } from "@clerk/backend";

import type { Papel } from "../context";
import type { BuscaDeContas, Conta, Pessoa } from "../dominio/tipos";

export interface Pessoas {
  /**
   * Casa nome, sobrenome, e-mail, telefone, username e userId, por trecho, e
   * devolve até LIMITE pessoas. Termo vazio lista as pessoas ativas mais
   * recentes, para a tela abrir com alguém. Com `entre`, busca só nesses
   * userIds (até 100); a lista vazia não casa ninguém.
   */
  buscar: (termo: string, entre?: readonly string[]) => Promise<BuscaDeContas>;
  /** null quando o Clerk não conhece o userId. */
  conta: (userId: string) => Promise<Conta | null>;
  /** Grava o Public metadata `papel`; o token da pessoa muda quando renova, em até 60 s. */
  definirPapel: (userId: string, papel: Papel) => Promise<void>;
  /** null quando o Clerk não conhece o userId. */
  porId: (userId: string) => Promise<Pessoa | null>;
}

export const LIMITE = 20;

/** A Backend API devolve o provedor como "oauth_google"; o tipo do SDK fala em "google". */
const OAUTH = /^oauth_/;

/** O Clerk aceita até 100 userIds num filtro. */
export const TETO_DO_FILTRO = 100;

export function paraPessoa(u: User): Pessoa {
  const email = u.primaryEmailAddress?.emailAddress ?? null;
  return {
    email,
    foto: u.hasImage ? u.imageUrl : null,
    nome: u.fullName ?? u.username ?? email ?? u.id,
    userId: u.id,
  };
}

function paraConta(u: User): Conta {
  const google = u.externalAccounts.some(
    (c) => c.provider.replace(OAUTH, "") === "google"
  );
  return {
    ...paraPessoa(u),
    criadaEm: new Date(u.createdAt),
    emailVerificado: u.primaryEmailAddress?.verification?.status === "verified",
    jeitosDeEntrar: [
      ...(u.passwordEnabled ? (["senha"] as const) : []),
      ...(google ? (["google"] as const) : []),
    ],
    papel: u.publicMetadata.papel === "admin" ? "admin" : "aluno",
    ultimoAcesso: u.lastActiveAt === null ? null : new Date(u.lastActiveAt),
  };
}

export function pessoasDoClerk(clerk: ClerkClient): Pessoas {
  return {
    async buscar(termo, entre) {
      if (entre?.length === 0) {
        return { pessoas: [], total: 0 };
      }
      const filtro = entre ? { userId: entre.slice(0, TETO_DO_FILTRO) } : {};
      const r = await clerk.users.getUserList(
        termo
          ? { ...filtro, limit: LIMITE, query: termo }
          : { ...filtro, limit: LIMITE, orderBy: "-last_active_at" }
      );
      return { pessoas: r.data.map(paraConta), total: r.totalCount };
    },
    async conta(userId) {
      const u = await umUsuario(clerk, userId);
      return u ? paraConta(u) : null;
    },
    async definirPapel(userId, papel) {
      // null tira a chave no merge do Clerk: sem papel, o claim vale aluno.
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: { papel: papel === "admin" ? "admin" : null },
      });
    },
    async porId(userId) {
      const u = await umUsuario(clerk, userId);
      return u ? paraPessoa(u) : null;
    },
  };
}

// A lista filtrada por userId devolve vazio para quem não existe; getUser
// lançaria 404 e pediria tradução de erro.
async function umUsuario(
  clerk: ClerkClient,
  userId: string
): Promise<User | null> {
  const r = await clerk.users.getUserList({ limit: 1, userId: [userId] });
  return r.data[0] ?? null;
}
