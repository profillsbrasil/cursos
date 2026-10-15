import type {
  AulaId,
  CursoCatalogo,
  CursoId,
  EstadoCurso,
  Historico,
} from "./tipos";

/**
 * O que estado e progresso leem de um curso. O CursoCatalogo serve, e a busca
 * do admin, que não lê capa nem título de aula, também.
 */
export interface CursoComAulas {
  id: CursoId;
  /** Em ordem de número, aulas em ordem de posição. */
  modulos: readonly { aulas: readonly { id: AulaId }[] }[];
  status: CursoCatalogo["status"];
  titulo: string;
}

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

const aulasDe = (c: CursoComAulas) => c.modulos.flatMap((m) => m.aulas);

export function progresso(
  curso: CursoComAulas,
  assistidas: ReadonlySet<AulaId>
): Progresso {
  const aulas = aulasDe(curso);
  const feitas = aulas.filter((a) => assistidas.has(a.id)).length;
  const total = aulas.length;
  // floor: 199 de 200 mostra 99%, nunca 100% com aula faltando
  return {
    feitas,
    pct: total === 0 ? 0 : Math.floor((feitas * 100) / total),
    total,
  };
}

export type EstadoQueAbre = Exclude<EstadoCurso, { tipo: "em_breve" }>;

export const podeAbrir = (e: EstadoCurso): e is EstadoQueAbre =>
  e.tipo !== "em_breve";

export const numeroDaAula = (indiceNoModulo: number): number =>
  indiceNoModulo + 1;

export function estadoDoCurso(curso: CursoComAulas, h: Historico): EstadoCurso {
  const cert = h.certificados.get(curso.id);
  if (cert) {
    // vence aula nova e volta a "em produção"
    return { certificado: cert, tipo: "concluido" };
  }
  const aulas = aulasDe(curso);
  const [primeira] = aulas;
  if (curso.status === "em_producao" || !primeira) {
    return { tipo: "em_breve" };
  }
  const tocado = aulas.some(
    (a) => h.assistidas.has(a.id) || h.posicoes.has(a.id)
  );
  const proxima = aulas.find((a) => !h.assistidas.has(a.id));
  if (!proxima) {
    return { tipo: "prova" };
  }
  return tocado
    ? { proximaAula: proxima.id, tipo: "em_andamento" }
    : { primeiraAula: primeira.id, tipo: "nao_iniciado" };
}

export interface CursoAlcancado<C extends CursoComAulas> {
  curso: C;
  estado: EstadoCurso;
}

/**
 * Os cursos que a pessoa alcança, os liberados, na ordem em que chegaram e sem
 * repetir, com o estado de cada um. Meus cursos, a busca e a tela de acesso do
 * admin leem o alcance daqui.
 */
export function alcance<C extends CursoComAulas>(
  liberados: readonly C[],
  h: Historico
): CursoAlcancado<C>[] {
  const vistos = new Map<CursoId, CursoAlcancado<C>>();
  for (const curso of liberados) {
    if (!vistos.has(curso.id)) {
      vistos.set(curso.id, { curso, estado: estadoDoCurso(curso, h) });
    }
  }
  return [...vistos.values()];
}

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
