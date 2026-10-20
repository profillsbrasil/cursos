// Só dos testes: os nomes que a folha tem de comportar, do comum ao que o
// formulário de Minha conta já recusa mas o Clerk aceitou antes do limite.

const repetido = (pedaco: string, caracteres: number) =>
  pedaco
    .repeat(Math.ceil(caracteres / pedaco.length))
    .slice(0, caracteres)
    .trim();

export const NOMES_DA_FOLHA = [
  ["20 caracteres", "Ana Beatriz da Silva"],
  ["uma palavra de 20 W", "W".repeat(20)],
  ["uma palavra de 30 W", "W".repeat(30)],
  [
    "100 caracteres",
    repetido("Maria Aparecida dos Santos Albuquerque Figueiredo ", 100),
  ],
  ["100 caracteres em palavras de 11 W", repetido("WWWWWWWWWWW ", 100)],
  ["256 A numa palavra", "A".repeat(256)],
  ["1.000 caracteres", repetido("Maria Aparecida ", 1000)],
  ["1.000 W em palavras de 9", repetido("WWWWWWWWW ", 1000)],
  [
    "uma palavra de 35 letras no meio",
    "Hubert Wolfeschlegelsteinhausenbergerdorff Blaine",
  ],
] as const;
