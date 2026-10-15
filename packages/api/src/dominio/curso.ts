import type {
  Antecessor,
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

export type EstadoQueAbre = Exclude<
  EstadoCurso,
  { tipo: "em_breve" } | { tipo: "bloqueado" }
>;

export const podeAbrir = (e: EstadoCurso): e is EstadoQueAbre =>
  e.tipo !== "em_breve" && e.tipo !== "bloqueado";

export const numeroDaAula = (indiceNoModulo: number): number =>
  indiceNoModulo + 1;

export function estadoDoCurso(
  curso: CursoComAulas,
  h: Historico,
  antes: Antecessor
): EstadoCurso {
  const cert = h.certificados.get(curso.id);
  if (cert) {
    // vence aula nova e volta a "em produção"
    return { certificado: cert, tipo: "concluido" };
  }
  const aulas = aulasDe(curso);
  const [primeira] = aulas;
  if (curso.status === "em_producao" || !primeira) {
    // em_breve vence bloqueado
    return { tipo: "em_breve" };
  }
  const tocado = aulas.some(
    (a) => h.assistidas.has(a.id) || h.posicoes.has(a.id)
  );
  // Curso começado nunca volta a ter cadeado quando a trilha muda de ordem.
  if (!tocado && antes.tipo === "na_trilha" && !antes.concluido) {
    return { liberadoPor: antes.curso, tipo: "bloqueado" };
  }
  const proxima = aulas.find((a) => !h.assistidas.has(a.id));
  if (!proxima) {
    return { tipo: "prova" };
  }
  return tocado
    ? { proximaAula: proxima.id, tipo: "em_andamento" }
    : { primeiraAula: primeira.id, tipo: "nao_iniciado" };
}

// Regra sequencial: dobra a lista em ordem e passa o antecessor adiante.
export function estadosDaTrilha(
  trilha: { cursos: readonly CursoComAulas[] },
  h: Historico,
  liberadosDireto: ReadonlySet<CursoId>
): EstadoCurso[] {
  const estados: EstadoCurso[] = [];
  let antes: Antecessor = { tipo: "livre" };
  for (const curso of trilha.cursos) {
    const estado = estadoDoCurso(
      curso,
      h,
      liberadosDireto.has(curso.id) ? { tipo: "livre" } : antes
    );
    estados.push(estado);
    antes = {
      concluido: estado.tipo === "concluido",
      curso: { id: curso.id, titulo: curso.titulo },
      tipo: "na_trilha",
    };
  }
  return estados;
}

export interface CursoAlcancado<C extends CursoComAulas> {
  curso: C;
  estado: EstadoCurso;
}

export interface Alcance<C extends CursoComAulas, T> {
  /** Liberados direto e fora de trilha liberada, na ordem em que chegaram, sem repetir. */
  soltos: CursoAlcancado<C>[];
  /** Na ordem em que chegaram; os cursos de cada uma em ordem de posição. */
  trilhas: { cursos: CursoAlcancado<C>[]; trilha: T }[];
}

/**
 * Os cursos que a pessoa alcança e o estado de cada um, como Meus cursos mostra:
 * o curso da trilha liberada pela regra sequencial, em que o liberado direto não
 * espera o anterior, e o curso solto sem antecessor. Meus cursos, a busca e a
 * tela de acesso do admin leem o alcance daqui.
 */
export function alcance<
  C extends CursoComAulas,
  T extends { cursos: readonly C[] },
>(trilhas: readonly T[], diretos: readonly C[], h: Historico): Alcance<C, T> {
  const liberadosDireto = new Set(diretos.map((c) => c.id));
  const naTrilha = new Set(trilhas.flatMap((t) => t.cursos.map((c) => c.id)));
  const soltos = new Map<CursoId, CursoAlcancado<C>>();
  for (const curso of diretos) {
    if (!(naTrilha.has(curso.id) || soltos.has(curso.id))) {
      soltos.set(curso.id, {
        curso,
        estado: estadoDoCurso(curso, h, { tipo: "livre" }),
      });
    }
  }
  return {
    soltos: [...soltos.values()],
    trilhas: trilhas.map((trilha) => {
      const estados = estadosDaTrilha(trilha, h, liberadosDireto);
      return {
        cursos: trilha.cursos.map((curso, i) => ({
          curso,
          estado: estados[i] ?? { tipo: "em_breve" },
        })),
        trilha,
      };
    }),
  };
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
