/** Só dos testes: confere, campo a campo, o valor que chega sem tipo (o JSON do Chromium, a saída de um processo), no lugar de afirmar o tipo. */
export type Predicado<T> = (valor: unknown) => valor is T;

type Conferido<P> = P extends Predicado<infer T> ? T : never;

export const ehQualquer = (_valor: unknown): _valor is unknown => true;

export const ehTexto = (valor: unknown): valor is string =>
  typeof valor === "string";

export const ehNumero = (valor: unknown): valor is number =>
  typeof valor === "number";

export const ehBooleano = (valor: unknown): valor is boolean =>
  typeof valor === "boolean";

export const ehRegistro = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

export const ehLista =
  <T>(item: Predicado<T>) =>
  (valor: unknown): valor is T[] =>
    Array.isArray(valor) && valor.every((v) => item(v));

export const ehRegistroDe =
  <T>(item: Predicado<T>) =>
  (valor: unknown): valor is Record<string, T> =>
    ehRegistro(valor) && Object.values(valor).every((v) => item(v));

export const ouNulo =
  <T>(eh: Predicado<T>) =>
  (valor: unknown): valor is T | null =>
    valor === null || eh(valor);

export const opcional =
  <T>(eh: Predicado<T>) =>
  (valor: unknown): valor is T | undefined =>
    valor === undefined || eh(valor);

export const ehObjeto =
  <C extends Record<string, Predicado<unknown>>>(campos: C) =>
  (valor: unknown): valor is { [K in keyof C]: Conferido<C[K]> } =>
    ehRegistro(valor) &&
    Object.entries(campos).every(([chave, eh]) => eh(valor[chave]));

export const ehTupla =
  <P extends Predicado<unknown>[]>(...itens: P) =>
  (valor: unknown): valor is { [I in keyof P]: Conferido<P[I]> } =>
    Array.isArray(valor) &&
    valor.length === itens.length &&
    itens.every((eh, i) => eh(valor[i]));
