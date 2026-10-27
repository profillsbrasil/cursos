import type { AulaId, CursoCatalogo, EstadoCurso } from "./tipos";

export interface Progresso {
  feitas: number;
  pct: number;
  total: number;
}

export interface FaixaNivel {
  feitas: number;
  nome: string;
  obtido: boolean;
  ordem: number;
  total: number;
}

export type EstadoQueAbre = Exclude<EstadoCurso, { tipo: "em_breve" }>;

export const podeAbrir = (e: EstadoCurso): e is EstadoQueAbre =>
  e.tipo !== "em_breve";

/**
 * A aula de amostra: a primeira do primeiro módulo, na ordem do curso. O módulo
 * sem aula não conta. Só ela toca para quem vê o curso pela liberação do perfil.
 */
export const aulaDeAmostra = (c: {
  modulos: readonly { aulas: readonly { id: AulaId }[] }[];
}): AulaId | null => c.modulos.flatMap((m) => m.aulas)[0]?.id ?? null;

export const numeroDaAula = (indiceNoModulo: number): number =>
  indiceNoModulo + 1;

export function niveis(
  curso: CursoCatalogo,
  assistidas: ReadonlySet<AulaId>
): { faixas: FaixaNivel[]; proximo: FaixaNivel | null } {
  const faixas = curso.niveis.map((n) => {
    const aulas = curso.modulos
      .filter((m) => m.nivelOrdem === n.ordem)
      .flatMap((m) => m.aulas);
    const feitas = aulas.filter((a) => assistidas.has(a.id)).length;
    return {
      ...n,
      feitas,
      obtido: aulas.length > 0 && feitas === aulas.length,
      total: aulas.length,
    };
  });
  // Nível sem aulas nunca é obtido, então não pode ser o próximo.
  return {
    faixas,
    proximo: faixas.find((f) => f.total > 0 && !f.obtido) ?? null,
  };
}
