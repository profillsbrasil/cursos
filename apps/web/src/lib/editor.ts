/** Foca o elemento depois que o React pôs a lista na ordem nova. */
export const focarDepois = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());

interface NaPagina<T> {
  compareDocumentPosition: (outro: T) => number;
}

/** Node.DOCUMENT_POSITION_PRECEDING, sem depender do DOM no teste. */
const VEM_ANTES = 2;

/**
 * O elemento que aparece primeiro na página. A lista de problemas sai na ordem
 * da validação (o schema começa pela capaAlt), e o foco segue a leitura.
 */
export function primeiroNaPagina<T extends NaPagina<T>>(
  elementos: readonly T[]
): T | undefined {
  return elementos.reduce<T | undefined>(
    (primeiro, e) =>
      primeiro === undefined ||
      // biome-ignore lint/suspicious/noBitwiseOperators: o DOM devolve a posição como máscara de bits.
      (primeiro.compareDocumentPosition(e) & VEM_ANTES) !== 0
        ? e
        : primeiro,
    undefined
  );
}

/** Foca, entre os ids, o campo que aparece primeiro na página. */
export function focarOPrimeiro(ids: readonly string[]) {
  const elementos = ids.flatMap((id) => {
    const e = document.getElementById(id);
    return e ? [e] : [];
  });
  primeiroNaPagina(elementos)?.focus();
}

/** O id de um item novo do rascunho (módulo, aula, curso, trilha). */
export const novoId = <T extends string>() => crypto.randomUUID() as T;
