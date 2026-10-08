import type { SessionAuthObject } from "@clerk/backend";
import type { Database } from "@cursos/db";

import { type marca, sessaoDe } from "./sessao";

export type Papel = "aluno" | "admin";

// A marca repete o papel e só sessaoDe a põe. Espalhar uma sessão de aluno com
// `papel: "admin"` deixa a marca "aluno", e o objeto não vale Sessao.
interface SessaoDe<P extends Papel> {
  readonly papel: P;
  readonly userId: string;
  readonly [marca]: P;
}

export type SessaoDeAdmin = SessaoDe<"admin">;

/** Quem está logado. Sem sessão, Context.auth é null. */
export type Sessao = SessaoDe<"aluno"> | SessaoDeAdmin;

export const ehAdmin = (sessao: Sessao | null): sessao is SessaoDeAdmin =>
  sessao?.papel === "admin";

/**
 * O que o servidor injeta uma vez por processo (apps/web/src/services.ts).
 * Os testes montam o Context por contextoDeTeste.
 */
export interface Servicos {
  readonly db: Database;
}

export interface Context extends Servicos {
  readonly auth: Sessao | null;
}

/** O que os dois construtores têm do Clerk: authenticateRequest().toAuth() e auth.protect(). */
export type AuthDoClerk = Pick<SessionAuthObject, "sessionClaims" | "userId">;

/**
 * Única leitura de sessionClaims do app. O claim `papel` vem do template
 * `{ "papel": "{{user.public_metadata.papel}}" }` do session token. Sem metadata o
 * Clerk manda null, e qualquer valor diferente de "admin" vale aluno: um erro de
 * configuração tira poder, nunca dá.
 */
export function contextoDe(
  clerk: AuthDoClerk | null,
  servicos: Servicos
): Context {
  const userId = clerk?.userId;
  if (!userId) {
    return { ...servicos, auth: null };
  }
  const papel = clerk.sessionClaims?.papel === "admin" ? "admin" : "aluno";
  return { ...servicos, auth: sessaoDe(papel, userId) };
}
