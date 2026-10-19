/** O que decide os jeitos de entrar, no formato do usuário do Clerk. */
export interface ContaParaEntrar {
  emailAddresses: readonly {
    id: string;
    linkedTo: readonly { id: string }[];
    verification: { status: string | null } | null;
  }[];
  externalAccounts: readonly {
    id: string;
    /** O id da identificação do Google, que aparece no `linkedTo` dos e-mails. */
    identificationId: string;
    provider: string;
  }[];
  passwordEnabled: boolean;
}

export const contaDoGoogle = <C extends ContaParaEntrar>(
  c: C
): C["externalAccounts"][number] | null =>
  c.externalAccounts.find((a) => a.provider === "google") ?? null;

/**
 * Desconectar o Google só quando sobra outro jeito de entrar: a senha, ou um
 * e-mail confirmado que não veio do Google, que recebe o código de entrada.
 * O e-mail ligado à conta do Google pode sair junto com ela.
 */
export function podeDesconectarOGoogle(c: ContaParaEntrar): boolean {
  const google = contaDoGoogle(c);
  if (!google) {
    return false;
  }
  return (
    c.passwordEnabled ||
    c.emailAddresses.some(
      (e) =>
        e.verification?.status === "verified" &&
        !e.linkedTo.some((l) => l.id === google.identificationId)
    )
  );
}
