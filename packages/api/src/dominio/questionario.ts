export const ALTERNATIVAS = { max: 5, min: 2 } as const;

export const LETRAS = ["A", "B", "C", "D", "E"] as const;

export const letraDa = (indice: number) => LETRAS[indice] ?? String(indice + 1);

/** Em por cento, para a conta ficar em inteiros: 3 × 70 / 100 é 2,1 exato. */
export const NOTA_MINIMA = 70;

export const acertosParaPassar = (perguntas: number) =>
  Math.ceil((perguntas * NOTA_MINIMA) / 100);
