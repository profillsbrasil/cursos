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

/** "03:42", "12:05". */
export function mmss(seg: number) {
  const s = Math.max(0, Math.floor(seg));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** "1,25×". */
export const fmtVelocidade = (v: number) => `${NUMERO.format(v)}×`;

/** "410", "2.340". */
export const fmtNum = (n: number) => NUMERO.format(n);

/** "+10 pts", "−300 pts". O sinal de menos é o U+2212, da largura do "+". */
export const fmtPtsComSinal = (n: number) =>
  n < 0 ? `−${fmtPts(-n)}` : `+${fmtPts(n)}`;

const DIA_DA_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];
const MS_POR_DIA = 86_400_000;

/** Dias ISO ("2026-10-04") viram datas UTC só para a conta: o fuso já veio do servidor. */
const utc = (dia: string) => new Date(`${dia}T00:00:00Z`);

/** Quando de uma linha do extrato: "Hoje", "Ontem", "Dom" na última semana, "4 out" antes. */
export function quando(dia: string, hoje: string) {
  const data = utc(dia);
  const atras = Math.round((utc(hoje).getTime() - data.getTime()) / MS_POR_DIA);
  if (atras === 0) {
    return "Hoje";
  }
  if (atras === 1) {
    return "Ontem";
  }
  if (atras > 1 && atras < 7) {
    return DIA_DA_SEMANA[data.getUTCDay()];
  }
  const ano =
    data.getUTCFullYear() === utc(hoje).getUTCFullYear()
      ? ""
      : ` ${data.getUTCFullYear()}`;
  return `${data.getUTCDate()} ${MES[data.getUTCMonth()]}${ano}`;
}
