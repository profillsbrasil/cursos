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
  modulos: readonly {
    aulas: readonly { id: AulaId; perguntas: number }[];
  }[];
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

/** As aulas com questionário: as aprovadas e as pendentes, reprovadas primeiro. */
export interface QuestionariosDoCurso {
  aprovados: number;
  pendentes: readonly AulaId[];
  total: number;
}

export function questionariosDoCurso(
  curso: CursoComAulas,
  h: Historico
): QuestionariosDoCurso {
  const comQuestionario = aulasDe(curso).filter((a) => a.perguntas > 0);
  const pendentes = comQuestionario.filter(
    (a) => !h.questionarios.get(a.id)?.aprovada
  );
  const reprovadas = pendentes.filter((a) => h.questionarios.has(a.id));
  const porFazer = pendentes.filter((a) => !h.questionarios.has(a.id));
  return {
    aprovados: comQuestionario.length - pendentes.length,
    pendentes: [...reprovadas, ...porFazer].map((a) => a.id),
    total: comQuestionario.length,
  };
}

/** A barra do curso quando as aulas acabaram: os questionários aprovados. */
export const progressoDosQuestionarios = (
  q: QuestionariosDoCurso
): Progresso => ({
  feitas: q.aprovados,
  pct: q.total === 0 ? 0 : Math.floor((q.aprovados * 100) / q.total),
  total: q.total,
});

export type EstadoQueAbre = Exclude<EstadoCurso, { tipo: "em_breve" }>;

export const podeAbrir = (e: EstadoCurso): e is EstadoQueAbre =>
  e.tipo !== "em_breve";

export const numeroDaAula = (indiceNoModulo: number): number =>
  indiceNoModulo + 1;

/**
 * A regra única do estado de um curso liberado. Meus cursos, a busca e o
 * acompanhamento do admin leem o estado daqui. O curso só é concluído com o
 * certificado, que concluirCurso emite na escrita que completa o curso (a
 * última aula assistida, o último questionário aprovado ou a edição do admin
 * que tira o que faltava); com tudo feito e sem certificado, o que só uma
 * corrida entre essas escritas deixa, o estado fica em `questionarios` apontando
 * para a primeira aula com questionário.
 */
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
    (a) =>
      h.assistidas.has(a.id) ||
      h.posicoes.has(a.id) ||
      h.questionarios.has(a.id)
  );
  const proxima = aulas.find((a) => !h.assistidas.has(a.id));
  if (proxima) {
    return tocado
      ? { proximaAula: proxima.id, tipo: "em_andamento" }
      : { primeiraAula: primeira.id, tipo: "nao_iniciado" };
  }
  const q = questionariosDoCurso(curso, h);
  const proximaAula =
    q.pendentes[0] ?? aulas.find((a) => a.perguntas > 0)?.id ?? primeira.id;
  return {
    aprovados: q.aprovados,
    proximaAula,
    tipo: "questionarios",
    total: q.total,
  };
}

/** Todas as aulas assistidas e todo questionário aprovado: o que emite o certificado. */
export const cursoCompleto = (curso: CursoComAulas, h: Historico): boolean =>
  aulasDe(curso).length > 0 &&
  aulasDe(curso).every((a) => h.assistidas.has(a.id)) &&
  questionariosDoCurso(curso, h).pendentes.length === 0;

export interface CursoNaTela<C extends CursoComAulas = CursoCatalogo> {
  curso: C;
  estado: EstadoCurso;
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
