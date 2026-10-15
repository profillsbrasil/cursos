// Formatos em pt-BR usados nas telas do aluno.

const NUMERO = new Intl.NumberFormat("pt-BR");

// Dois formatos de data, e só eles: o longo ("20 de agosto de 2026") e o curto
// ("7 de out.", com " de 2025" fora do ano de hoje).
const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

const DIA_CURTO = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

// O dia (AAAA-MM-DD) já é do calendário de São Paulo: lido em UTC, não muda de dia.
const DIA_DO_CALENDARIO = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const DIA_DO_CALENDARIO_COM_ANO = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

const DIA_EM_SAO_PAULO = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

const ESPACOS = /\s+/;

/** "Ana Souza" vira "AS"; e-mail ou userId vira a primeira letra. */
export function iniciais(nome: string) {
  const partes = nome.trim().split(ESPACOS);
  const primeira = partes[0]?.[0] ?? "?";
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? "") : "";
  return `${primeira}${ultima}`.toUpperCase();
}

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

/** O formato longo: "2 de outubro de 2026", no fuso de São Paulo. */
export const fmtData = (iso: string) => DATA.format(new Date(iso));

/**
 * O formato curto de um instante, "2 de out.", no fuso de São Paulo, sem o ano:
 * só para o que é recente, como o comunicado do topo. Com o ano em jogo, use
 * `diaCurto(diaEmSaoPaulo(iso), hoje)`.
 */
export const fmtDiaCurto = (iso: string) => DIA_CURTO.format(new Date(iso));

/** "2.340 pts". */
export const fmtPts = (n: number) => `${NUMERO.format(n)} pts`;

/** "03:42", "12:05". */
export function mmss(seg: number) {
  const s = Math.max(0, Math.floor(seg));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const MM_SS = /^(\d+):([0-5]\d)$/;
const H_MM_SS = /^(\d+):([0-5]\d):([0-5]\d)$/;

export function duracaoDoTexto(texto: string): number | null {
  const s = texto.trim();
  const curta = MM_SS.exec(s);
  const longa = H_MM_SS.exec(s);
  let total: number;
  if (curta) {
    total = Number(curta[1]) * 60 + Number(curta[2]);
  } else if (longa) {
    total = Number(longa[1]) * 3600 + Number(longa[2]) * 60 + Number(longa[3]);
  } else {
    return null;
  }
  return total > 0 ? total : null;
}

/** "1,25×". */
export const fmtVelocidade = (v: number) => `${NUMERO.format(v)}×`;

export const fmtNum = (n: number) => NUMERO.format(n);

const SINAL_DE_MENOS = "\u2212";

export const fmtPtsComSinal = (n: number) =>
  n < 0 ? `${SINAL_DE_MENOS}${fmtPts(-n)}` : `+${fmtPts(n)}`;

const DIA_DA_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MS_POR_DIA = 86_400_000;

const utc = (dia: string) => new Date(`${dia}T00:00:00Z`);

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
  return diaCurto(dia, hoje);
}

/** O formato curto: "21 de set.", ou "21 de set. de 2025" fora do ano de hoje. */
export function diaCurto(dia: string, hoje: string) {
  const data = utc(dia);
  const formato =
    data.getUTCFullYear() === utc(hoje).getUTCFullYear()
      ? DIA_DO_CALENDARIO
      : DIA_DO_CALENDARIO_COM_ANO;
  return formato.format(data);
}

/** O dia de um instante no calendário de São Paulo: "2026-10-07". */
export const diaEmSaoPaulo = (iso: string) =>
  DIA_EM_SAO_PAULO.format(new Date(iso));

/** O dia dentro da frase: "hoje", "ontem" ou "em 21 de set.". */
export function noDia(dia: string, hoje: string) {
  const atras = Math.round(
    (utc(hoje).getTime() - utc(dia).getTime()) / MS_POR_DIA
  );
  if (atras === 0) {
    return "hoje";
  }
  if (atras === 1) {
    return "ontem";
  }
  return `em ${diaCurto(dia, hoje)}`;
}
