import type { EmailAddress, ExternalAccount, User } from "@clerk/backend";

import type { Papel } from "../context";
import { type Email, lerEmail } from "../dominio/convite";
import type { BuscaDeContas, Conta, Pessoa } from "../dominio/tipos";

/** O Clerk é a tabela de usuários. O tipo User do SDK não sai deste arquivo: o resto do código vê Pessoa. */
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
  /**
   * Quais destes e-mails já são de uma conta, principal ou não, com o userId dela.
   * O e-mail casa inteiro, sem caixa: `ana@x.com` não é a conta de `diana@x.com`.
   */
  contasCom: (emails: readonly Email[]) => Promise<ReadonlyMap<Email, string>>;
  /** Grava o Public metadata `papel`; o token da pessoa muda quando renova, em até 60 s. */
  definirPapel: (userId: string, papel: Papel) => Promise<void>;
  /** null quando o Clerk não conhece o userId. */
  porId: (userId: string) => Promise<Pessoa | null>;
}

/** O que as pessoas leem de um usuário do Clerk. O User do SDK satisfaz. */
export interface UsuarioDoClerk extends Pick<
  User,
  | "createdAt"
  | "fullName"
  | "hasImage"
  | "id"
  | "imageUrl"
  | "lastActiveAt"
  | "passwordEnabled"
  | "publicMetadata"
  | "username"
> {
  readonly emailAddresses: readonly Pick<EmailAddress, "emailAddress">[];
  readonly externalAccounts: readonly Pick<ExternalAccount, "provider">[];
  readonly primaryEmailAddress: {
    readonly emailAddress: string;
    readonly verification?: { readonly status: string } | null;
  } | null;
}

/** Os filtros da lista de usuários que as pessoas pedem ao Clerk. */
export interface FiltroDeUsuarios {
  readonly emailAddress?: string[];
  readonly limit: number;
  readonly offset?: number;
  readonly orderBy?: "-last_active_at";
  readonly query?: string;
  readonly userId?: string[];
}

/** O que as pessoas usam do Clerk: a lista de usuários e o Public metadata. O ClerkClient satisfaz. */
export interface ClerkDasPessoas {
  readonly users: {
    getUserList: (
      filtro: FiltroDeUsuarios
    ) => Promise<{ data: readonly UsuarioDoClerk[]; totalCount: number }>;
    updateUserMetadata: (
      userId: string,
      metadata: { publicMetadata: { papel: "admin" | null } }
    ) => Promise<unknown>;
  };
}

export const LIMITE = 20;

const PREFIXO_OAUTH_DA_BACKEND_API = /^oauth_/;

/** O Clerk aceita até 100 userIds num filtro. */
export const TETO_DO_FILTRO = 100;

export function paraPessoa(u: UsuarioDoClerk): Pessoa {
  const email = u.primaryEmailAddress?.emailAddress ?? null;

  return {
    email,
    foto: u.hasImage ? u.imageUrl : null,
    nome: u.fullName ?? u.username ?? email ?? u.id,
    nomeProprio: u.fullName,
    userId: u.id,
  };
}

function paraConta(u: UsuarioDoClerk): Conta {
  const google = u.externalAccounts.some(
    (c) => c.provider.replace(PREFIXO_OAUTH_DA_BACKEND_API, "") === "google"
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

export function pessoasDoClerk(clerk: ClerkDasPessoas): Pessoas {
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
    async contasCom(emails) {
      const pedidos = new Set<string>(emails);
      const achadas = new Map<Email, string>();
      // WARNING: o filtro emailAddress do Clerk casa trecho (`ana@x.com` traz `diana@x.com`), então a igualdade é conferida aqui.
      let offset = 0;

      while (pedidos.size > 0 && achadas.size < pedidos.size) {
        // oxlint-disable-next-line no-await-in-loop -- a página seguinte só existe depois da anterior.
        const r = await clerk.users.getUserList({
          emailAddress: [...pedidos],
          limit: TETO_DO_FILTRO,
          offset,
        });

        for (const u of r.data) {
          for (const e of u.emailAddresses) {
            const email = lerEmail(e.emailAddress);

            if (email !== null && pedidos.has(email)) {
              achadas.set(email, u.id);
            }
          }
        }

        offset += r.data.length;

        if (r.data.length === 0 || offset >= r.totalCount) {
          break;
        }
      }

      return achadas;
    },
    async definirPapel(userId, papel) {
      // WARNING: null tira a chave no merge do Clerk, e sem papel o claim vale aluno.
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

async function umUsuario(
  clerk: ClerkDasPessoas,
  userId: string
): Promise<UsuarioDoClerk | null> {
  const r = await clerk.users.getUserList({ limit: 1, userId: [userId] });

  return r.data[0] ?? null;
}
