const AULA = /^\/cursos\/[^/]+\/aulas\/[^/]+/;

/** O endereço da aula aberta no caminho, ou null fora de uma aula. */
export function aulaDoCaminho(caminho: string | null): string | null {
  return caminho?.match(AULA)?.[0] ?? null;
}

/**
 * Se a sidebar do computador está aberta. `preferida` é a do cookie, e só muda
 * fora da aula. Cada aula aberta começa recolhida, para dar espaço ao vídeo, e
 * fica como a pessoa a deixar até ela abrir outra aula ou sair.
 */
export type Abertura =
  | { lugar: "fora"; preferida: boolean }
  | { aberta: boolean; aula: string; lugar: "aula"; preferida: boolean };

export function aberturaEm(
  caminho: string | null,
  preferida: boolean
): Abertura {
  const aula = aulaDoCaminho(caminho);
  return aula === null
    ? { lugar: "fora", preferida }
    : { aberta: false, aula, lugar: "aula", preferida };
}

export const estaAberta = (a: Abertura) =>
  a.lugar === "aula" ? a.aberta : a.preferida;

/** A mesma aula devolve a mesma Abertura, e quem compara por referência sabe que nada mudou. */
export function navegar(a: Abertura, caminho: string | null): Abertura {
  const aula = aulaDoCaminho(caminho);
  if (aula === (a.lugar === "aula" ? a.aula : null)) {
    return a;
  }
  return aberturaEm(caminho, a.preferida);
}

export function alternar(a: Abertura, aberta: boolean): Abertura {
  return a.lugar === "aula" ? { ...a, aberta } : { ...a, preferida: aberta };
}
