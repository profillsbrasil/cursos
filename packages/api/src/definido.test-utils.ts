/** O valor que o teste exige: lança quando falta, no lugar do `?? ""` que mandava texto vazio ao banco. */
export function definido<T>(valor: T | null | undefined): T {
  if (valor === null || valor === undefined) {
    throw new Error("O teste esperava um valor e recebeu nada.");
  }

  return valor;
}
