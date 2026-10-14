type ClerkTokenGetter = () => Promise<string | null>;

let clerkTokenGetter: ClerkTokenGetter | null = null;

export function setClerkAuthTokenGetter(getToken: ClerkTokenGetter | null) {
  clerkTokenGetter = getToken;
}

export async function getClerkAuthToken() {
  return (await clerkTokenGetter?.()) ?? null;
}

/** A parte do `window.Clerk` (o clerk-js) que esta leitura usa. */
interface ClerkNoNavegador {
  session?: {
    lastActiveToken: {
      getRawString: () => string;
      jwt?: { claims: { exp: number } };
    } | null;
  } | null;
}

/**
 * O token de um envio que não pode esperar a rede, como o registro no pagehide, em
 * que só as microtarefas da tarefa do evento rodam. O getToken do Clerk responde
 * nelas só com o token do cache, e o cache solta o token 5 s antes de ele vencer:
 * dali até a renovação chegar, o getToken espera a rede, e o envio se perde. O último
 * token da sessão ainda vale nesse intervalo, e o servidor aceita 5 s de folga de
 * relógio. Sem ele, ou com ele vencido, o envio espera o getToken.
 */
export function getClerkAuthTokenSemEspera(): Promise<string | null> {
  const clerk: ClerkNoNavegador | undefined = Reflect.get(globalThis, "Clerk");
  const ultimo = clerk?.session?.lastActiveToken;
  const exp = ultimo?.jwt?.claims.exp;
  if (ultimo && exp !== undefined && exp * 1000 > Date.now()) {
    return Promise.resolve(ultimo.getRawString());
  }
  return getClerkAuthToken();
}
