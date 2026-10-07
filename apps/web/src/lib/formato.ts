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

/** Verbo que concorda com a quantidade: "Falta 1 dia", "Faltam 2 dias". */
export const faltam = (n: number) => (n === 1 ? "Falta" : "Faltam");

/** Minutos arredondados, nunca abaixo de 1. */
export const minutos = (seg: number) => Math.max(1, Math.round(seg / 60));

/** Minutos arredondados: "6 min". */
export const fmtMin = (seg: number) => `${minutos(seg)} min`;

/** "1 h 25 min", "12 h", "45 min". Arredonda os minutos antes de separar as horas. */
export function fmtHoras(seg: number) {
  const total = minutos(seg);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) {
    return `${m} min`;
  }
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** "2 de outubro de 2026", no fuso de São Paulo. */
export const fmtData = (iso: string) => DATA.format(new Date(iso));

/** "2.340 pts". */
export const fmtPts = (n: number) => `${NUMERO.format(n)} pts`;

/** "03:42", "12:05": o relógio do player. */
export function mmss(seg: number) {
  const s = Math.max(0, Math.floor(seg));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** "1,25×". */
export const fmtVelocidade = (v: number) => `${NUMERO.format(v)}×`;
