import type { SessionAuthObject } from "@clerk/backend";
import type { Database } from "@cursos/db";

export type Papel = "aluno" | "admin";

/** Quem está logado. Sem sessão, Context.auth é null. */
export interface Sessao {
  readonly papel: Papel;
  readonly userId: string;
}

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
  const papel: Papel =
    clerk.sessionClaims?.papel === "admin" ? "admin" : "aluno";
  return { ...servicos, auth: { papel, userId } };
}
