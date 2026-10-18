// O curso como a pessoa o estudou, lido de uma vez: o estado do curso, o
// progresso, os questionários, a aula da vez e se o curso está completo para o
// certificado. Meus cursos, a página do curso, o player, a página do
// certificado, o acompanhamento do admin e a emissão do certificado leem daqui,
// e nenhum deles decide de novo se um curso abre, foi começado ou terminou.

import { numeroDaAula, type Progresso } from "./curso";
import type { Estudo } from "./historico";
import type {
  AulaId,
  CursoId,
  EstadoCurso,
  Historico,
  StatusDoCurso,
} from "./tipos";

/**
 * O que a leitura pede de um curso. O CursoCatalogo serve, e a busca do admin e
 * a emissão do certificado, que não leem capa nem título de aula, também.
 */
export interface CursoComAulas {
  id: CursoId;
  /** Em ordem de número, aulas em ordem de posição. */
  modulos: readonly {
    aulas: readonly { id: AulaId; perguntas: number }[];
    numero: number;
    titulo: string;
  }[];
  status: StatusDoCurso;
  titulo: string;
}

export interface OndeNoCurso {
  /** Número da aula dentro do módulo, a partir de 1. */
  aula: number;
  modulo: { numero: number; titulo: string };
}

/**
 * A aula para onde o Continuar leva: a da retomada no curso começado ou não
 * iniciado, a do próximo questionário quando as aulas acabaram.
 */
export interface AulaDaVez {
  id: AulaId;
  onde: OndeNoCurso;
  /** A posição salva nessa aula; 0 sem ela. */
  posicaoSeg: number;
}

export interface CursoDoAluno {
  /** null quando o curso não abre aula: em produção ou concluído. */
  aulaDaVez: AulaDaVez | null;
  /**
   * Curso publicado com todas as aulas assistidas e todo questionário aprovado:
   * o que emite o certificado. Não lê o certificado, então o curso concluído
   * que ganhou aula nova não está completo.
   */
  completo: boolean;
  estado: EstadoCurso;
  progresso: Progresso;
  /** Os questionários aprovados sobre as aulas com questionário. */
  questionarios: Progresso;
}

const aulasDe = (c: CursoComAulas) => c.modulos.flatMap((m) => m.aulas);

// floor: 199 de 200 mostra 99%, nunca 100% com aula faltando
const fracao = (feitas: number, total: number): Progresso => ({
  feitas,
  pct: total === 0 ? 0 : Math.floor((feitas * 100) / total),
  total,
});

/** As aulas com questionário por aprovar, as reprovadas primeiro. */
function questionariosPendentes(curso: CursoComAulas, h: Historico) {
  const comQuestionario = aulasDe(curso).filter((a) => a.perguntas > 0);
  const pendentes = comQuestionario.filter(
    (a) => !h.questionarios.get(a.id)?.aprovada
  );
  const reprovadas = pendentes.filter((a) => h.questionarios.has(a.id));
  const porFazer = pendentes.filter((a) => !h.questionarios.has(a.id));
  return {
    pendentes: [...reprovadas, ...porFazer].map((a) => a.id),
    progresso: fracao(
      comQuestionario.length - pendentes.length,
      comQuestionario.length
    ),
  };
}

/**
 * A regra única do estado de um curso liberado. O curso só é concluído com o
 * certificado, que a emissão grava na escrita que completa o curso (a última
 * aula assistida, o último questionário aprovado ou a edição do admin que tira
 * o que faltava); com tudo feito e sem certificado, o que só uma corrida entre
 * essas escritas deixa, o estado fica em `questionarios` apontando para a
 * primeira aula com questionário.
 */
function estadoDoCurso(
  curso: CursoComAulas,
  h: Historico,
  pendentes: readonly AulaId[],
  questionarios: Progresso
): EstadoCurso {
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
  const proximaAula =
    pendentes[0] ?? aulas.find((a) => a.perguntas > 0)?.id ?? primeira.id;
  return {
    aprovados: questionarios.feitas,
    proximaAula,
    tipo: "questionarios",
    total: questionarios.total,
  };
}

/**
 * Começar leva à primeira aula. Continuar leva à aula da atividade mais recente,
 * ou à próxima não assistida quando aquela já foi assistida.
 */
function aulaDaVezId(
  curso: CursoComAulas,
  estado: EstadoCurso,
  { atividade, historico: h }: Estudo
): AulaId | null {
  switch (estado.tipo) {
    case "em_breve":
    case "concluido":
      return null;
    case "nao_iniciado":
      return estado.primeiraAula;
    case "questionarios":
      return estado.proximaAula;
    case "em_andamento": {
      let ultima: { aulaId: AulaId; quando: string } | null = null;
      for (const aula of aulasDe(curso)) {
        const quando = atividade.get(aula.id);
        if (quando && (!ultima || quando > ultima.quando)) {
          ultima = { aulaId: aula.id, quando };
        }
      }
      return ultima && !h.assistidas.has(ultima.aulaId)
        ? ultima.aulaId
        : estado.proximaAula;
    }
    default:
      return estado satisfies never;
  }
}

function ondeNoCurso(curso: CursoComAulas, aulaId: AulaId): OndeNoCurso {
  for (const modulo of curso.modulos) {
    const i = modulo.aulas.findIndex((a) => a.id === aulaId);
    if (i >= 0) {
      return {
        aula: numeroDaAula(i),
        modulo: { numero: modulo.numero, titulo: modulo.titulo },
      };
    }
  }
  throw new Error(`Aula ${aulaId} fora do curso ${curso.titulo}`);
}

export function lerCursoDoAluno(
  curso: CursoComAulas,
  estudo: Estudo
): CursoDoAluno {
  const h = estudo.historico;
  const aulas = aulasDe(curso);
  const q = questionariosPendentes(curso, h);
  const estado = estadoDoCurso(curso, h, q.pendentes, q.progresso);
  const id = aulaDaVezId(curso, estado, estudo);
  return {
    aulaDaVez:
      id === null
        ? null
        : {
            id,
            onde: ondeNoCurso(curso, id),
            posicaoSeg: h.posicoes.get(id)?.posicaoSeg ?? 0,
          },
    completo:
      curso.status !== "em_producao" &&
      aulas.length > 0 &&
      aulas.every((a) => h.assistidas.has(a.id)) &&
      q.pendentes.length === 0,
    estado,
    progresso: fracao(
      aulas.filter((a) => h.assistidas.has(a.id)).length,
      aulas.length
    ),
    questionarios: q.progresso,
  };
}
