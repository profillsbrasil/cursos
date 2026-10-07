// Formatos em pt-BR usados nas telas do aluno.

const NUMERO = new Intl.NumberFormat("pt-BR");

const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

/** "1 aula", "3 aulas". */
export const plural = (n: number, um: string, varios: string) =>
  `${NUMERO.format(n)} ${n === 1 ? um : varios}`;

/** Minutos arredondados: "6 min". */
export const fmtMin = (seg: number) =>
  `${Math.max(1, Math.round(seg / 60))} min`;

/** "1 h 25 min", "45 min". */
export function fmtHoras(seg: number) {
  const h = Math.floor(seg / 3600);
  const m = Math.round((seg % 3600) / 60);
  if (h === 0) {
    return `${m} min`;
  }
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** "2 de outubro de 2026", no fuso de São Paulo. */
export const fmtData = (iso: string) => DATA.format(new Date(iso));

/** "2.340 pts". */
export const fmtPts = (n: number) => `${NUMERO.format(n)} pts`;
