import type { Papel, Sessao } from "./context";
import { MarcaRecusada } from "./dominio/marcas";
import type { AdminId } from "./dominio/tipos";

export declare const marca: unique symbol;

/**
 * Fora dos exports do pacote: o app não importa `sessaoDe` e não consegue montar
 * uma `Sessao`. Ela só nasce em `contextoDe` e `contextoDeTeste`.
 */
export const sessaoDe = (papel: Papel, userId: string) =>
  ({ papel, userId }) as Sessao;

const ehAdminId = (userId: string, papel: Papel): userId is AdminId =>
  papel === "admin" && userId !== "";

/**
 * O único lugar que fabrica um AdminId. O papel da Sessao vem do claim `papel`
 * do session token, lido uma vez em `contextoDe`; sessão de aluno lança
 * MarcaRecusada.
 */
export function adminIdDe(sessao: Sessao): AdminId {
  const { papel, userId } = sessao;

  if (ehAdminId(userId, papel)) {
    return userId;
  }

  throw new MarcaRecusada(userId);
}
