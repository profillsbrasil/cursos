import {
  diaUtilAnterior,
  ehDiaUtil,
  somarDias,
} from "@cursos/api/dominio/sequencia";
import type { DiaISO } from "@cursos/api/dominio/tipos";

export interface DiaDaSequencia {
  /** Entre o dia anterior da lista e este houve sábado e domingo. */
  depoisDoFimDeSemana: boolean;
  dia: DiaISO;
  estado: "feito" | "hoje" | "por_vir";
}

function proximoDiaUtil(dia: DiaISO): DiaISO {
  let d = somarDias(dia, 1);
  while (!ehDiaUtil(d)) {
    d = somarDias(d, 1);
  }
  return d;
}

/**
 * Os `meta` dias úteis da sequência em curso. Os `dias` feitos terminam hoje,
 * quando hoje é dia útil e já tem aula, ou no dia útil anterior; depois vêm os
 * dias úteis seguintes, com hoje marcado quando é dia útil ainda sem aula.
 */
export function diasDaSequencia({
  dias,
  hoje,
  hojePendente,
  meta,
}: {
  dias: number;
  hoje: DiaISO;
  hojePendente: boolean;
  meta: number;
}): DiaDaSequencia[] {
  const fim = ehDiaUtil(hoje) && !hojePendente ? hoje : diaUtilAnterior(hoje);
  const semana: Omit<DiaDaSequencia, "depoisDoFimDeSemana">[] = [];
  for (let d = fim; semana.length < dias; d = diaUtilAnterior(d)) {
    semana.unshift({ dia: d, estado: "feito" });
  }
  for (let d = proximoDiaUtil(fim); semana.length < meta; ) {
    semana.push({ dia: d, estado: d === hoje ? "hoje" : "por_vir" });
    d = proximoDiaUtil(d);
  }
  return semana.map((d, i) => ({
    ...d,
    depoisDoFimDeSemana:
      i > 0 && somarDias(semana[i - 1]?.dia ?? d.dia, 1) !== d.dia,
  }));
}
