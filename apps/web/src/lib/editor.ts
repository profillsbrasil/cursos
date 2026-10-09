/** Foca o elemento depois que o React pôs a lista na ordem nova. */
export const focarDepois = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());

/** O id de um item novo do rascunho (módulo, aula, curso, trilha). */
export const novoId = <T extends string>() => crypto.randomUUID() as T;
