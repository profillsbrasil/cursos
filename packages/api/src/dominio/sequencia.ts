import { META_SEQUENCIA } from "./regras";
import type { DiaISO } from "./tipos";

export type StatusDia =
  | "estudou"
  | "hoje_estudou"
  | "hoje_pendente"
  | "nao_estudou"
  | "futuro"
  | "fim_de_semana";

export interface DiaDaSemana {
  dia: DiaISO;
  nome: string;
  sigla: string;
  status: StatusDia;
}

const FUSO = "America/Sao_Paulo";
const formatador = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: FUSO,
  year: "numeric",
});

const SIGLAS = ["S", "T", "Q", "Q", "S", "S", "D"] as const;
const NOMES = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;

export const diaLocal = (agora: Date): DiaISO =>
  formatador.format(agora) as DiaISO;

const meioDia = (dia: DiaISO) => new Date(`${dia}T12:00:00Z`);

export function somarDias(dia: DiaISO, n: number): DiaISO {
  const d = meioDia(dia);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10) as DiaISO;
}

/** 0 = domingo. */
const diaDaSemana = (dia: DiaISO) => meioDia(dia).getUTCDay();

export const ehDiaUtil = (dia: DiaISO): boolean => {
  const d = diaDaSemana(dia);
  return d !== 0 && d !== 6;
};

export function diaUtilAnterior(dia: DiaISO): DiaISO {
  let d = somarDias(dia, -1);
  while (!ehDiaUtil(d)) {
    d = somarDias(d, -1);
  }
  return d;
}

// Hoje sem estudo ainda não quebra: a contagem começa no dia útil anterior.
export function sequenciaDiasUteis(
  dias: ReadonlySet<DiaISO>,
  hoje: DiaISO
): number {
  let cursor = ehDiaUtil(hoje) && dias.has(hoje) ? hoje : diaUtilAnterior(hoje);
  let n = 0;
  while (dias.has(cursor)) {
    n += 1;
    cursor = diaUtilAnterior(cursor);
  }
  return n;
}

export const segundaDaSemana = (hoje: DiaISO): DiaISO =>
  somarDias(hoje, -((diaDaSemana(hoje) + 6) % 7));

export const faltamParaBonus = (
  sequencia: number,
  meta: number = META_SEQUENCIA
): number => meta - (sequencia % meta);

function statusDoDia(
  dia: DiaISO,
  hoje: DiaISO,
  dias: ReadonlySet<DiaISO>
): StatusDia {
  if (!ehDiaUtil(dia)) {
    return "fim_de_semana";
  }
  if (dia === hoje) {
    return dias.has(dia) ? "hoje_estudou" : "hoje_pendente";
  }
  if (dia > hoje) {
    return "futuro";
  }
  return dias.has(dia) ? "estudou" : "nao_estudou";
}

export function semana(dias: ReadonlySet<DiaISO>, hoje: DiaISO): DiaDaSemana[] {
  const segunda = segundaDaSemana(hoje);
  return SIGLAS.map((sigla, i) => {
    const dia = somarDias(segunda, i);
    return {
      dia,
      nome: NOMES[i] ?? "",
      sigla,
      status: statusDoDia(dia, hoje, dias),
    };
  });
}
