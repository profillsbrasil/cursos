import type { ClerkClient } from "@clerk/backend";
import { isClerkAPIResponseError } from "@clerk/backend/errors";

import { type Email, VALIDADE_EM_DIAS } from "../dominio/convite";

/** No tipo "limite", o Clerk respondeu 429 e `tentarEm` vem do Retry-After. */
export type EnvioDoConvite =
  | { tipo: "enviado"; clerkConviteId: string }
  | { tipo: "limite"; tentarEm: Date };

export interface Convites {
  /**
   * Manda o e-mail com o link de criar conta e devolve o id do convite do Clerk.
   * O convite vai sem metadata: o link não dá perfil, papel nem curso. Envia
   * mesmo que o Clerk já tenha convite para o e-mail; quem chama já decidiu.
   * Qualquer outra falha lança.
   */
  enviar: (email: Email, agora: Date) => Promise<EnvioDoConvite>;
  /**
   * Tira a validade do link. Nunca lança: revogar o que já foi revogado, aceito
   * ou expirado é sucesso, e a falha vai ao log. O link que sobra só cria conta.
   */
  revogar: (clerkConviteId: string) => Promise<void>;
}

const LIMITE_DE_ENVIOS = 429;

const ESPERA_SEM_RETRY_AFTER_SEG = 3600;

/**
 * O Clerk é o carteiro do convite: manda o e-mail com o link e o revoga. O tipo
 * Invitation do SDK e o status do convite no Clerk não saem deste arquivo, e o app
 * nunca os lê: o estado mora na tabela convite.
 */
export function convitesDoClerk(
  clerk: ClerkClient,
  opcoes: { criarConta: string }
): Convites {
  return {
    async enviar(email, agora) {
      try {
        const convite = await clerk.invitations.createInvitation({
          emailAddress: email,
          expiresInDays: VALIDADE_EM_DIAS,
          // WARNING: sem ignoreExisting, o Clerk recusa e-mail já convidado com erro sem código documentado.
          ignoreExisting: true,
          notify: true,
          redirectUrl: opcoes.criarConta,
        });

        return { clerkConviteId: convite.id, tipo: "enviado" };
      } catch (erro) {
        if (isClerkAPIResponseError(erro) && erro.status === LIMITE_DE_ENVIOS) {
          const espera = erro.retryAfter ?? ESPERA_SEM_RETRY_AFTER_SEG;

          return {
            tentarEm: new Date(agora.getTime() + espera * 1000),
            tipo: "limite",
          };
        }

        throw erro;
      }
    },
    async revogar(clerkConviteId) {
      try {
        await clerk.invitations.revokeInvitation(clerkConviteId);
      } catch (erro) {
        console.warn(
          `convite ${clerkConviteId}: o Clerk não revogou o link, que só cria conta`,
          erro
        );
      }
    },
  };
}
