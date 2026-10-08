// Fora dos exports do pacote: o app não importa sessaoDe e não consegue
// montar uma Sessao. Ela só nasce em contextoDe e contextoDeTeste.

import type { Papel, Sessao } from "./context";

export declare const marca: unique symbol;

export const sessaoDe = (papel: Papel, userId: string) =>
  ({ papel, userId }) as Sessao;
