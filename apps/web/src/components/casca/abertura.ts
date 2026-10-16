const AULA = /^\/cursos\/[^/]+\/aulas\/[^/]+/;

export function aulaDoCaminho(caminho: string | null): string | null {
  return caminho?.match(AULA)?.[0] ?? null;
}

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

export function navegar(
  a: Abertura,
  caminho: string | null
): Abertura | "mesmo_lugar" {
  const aula = aulaDoCaminho(caminho);
  if (aula === (a.lugar === "aula" ? a.aula : null)) {
    return "mesmo_lugar";
  }
  return aberturaEm(caminho, a.preferida);
}

export function alternar(a: Abertura, aberta: boolean): Abertura {
  return a.lugar === "aula" ? { ...a, aberta } : { ...a, preferida: aberta };
}
