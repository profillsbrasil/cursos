import type { Papel, Sessao } from "./context";

export declare const marca: unique symbol;

/**
 * Fora dos exports do pacote: o app não importa `sessaoDe` e não consegue montar
 * uma `Sessao`. Ela só nasce em `contextoDe` e `contextoDeTeste`.
 */
export const sessaoDe = (papel: Papel, userId: string) =>
  ({ papel, userId }) as Sessao;
