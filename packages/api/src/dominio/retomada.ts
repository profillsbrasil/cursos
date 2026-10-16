import {
  type CursoNaTela,
  niveis,
  numeroDaAula,
  progresso,
  progressoDosQuestionarios,
  questionariosDoCurso,
} from "./curso";
import type { Retomada } from "./painel";
import type { AulaId, CursoCatalogo, EstadoCurso, Historico } from "./tipos";

export interface EntradaRetomada {
  /** Momento ISO da última atividade por aula: assistida ou posição salva. */
  atividade: ReadonlyMap<AulaId, string>;
  /** Cursos acessíveis na ordem da tela. */
  cursos: readonly CursoNaTela[];
  historico: Historico;
}

const aulasDe = (c: CursoCatalogo) => c.modulos.flatMap((m) => m.aulas);

const cursoRef = (c: CursoCatalogo) => ({
  capa: c.capa,
  slug: c.slug,
  titulo: c.titulo,
});

/** O módulo e o número da aula dentro dele, como o aluno vê ("Módulo 8, aula 4"). */
export function localizar(curso: CursoCatalogo, aulaId: AulaId) {
  for (const modulo of curso.modulos) {
    const i = modulo.aulas.findIndex((a) => a.id === aulaId);
    const aula = modulo.aulas[i];
    if (aula) {
      return { aula, modulo, numeroNoModulo: numeroDaAula(i) };
    }
  }
  throw new Error(`Aula ${aulaId} fora do curso ${curso.slug}`);
}

function continuar(
  item: CursoNaTela,
  aulaId: AulaId,
  posicaoSeg: number,
  h: Historico
): Retomada {
  const { aula, modulo, numeroNoModulo } = localizar(item.curso, aulaId);
  return {
    aula: {
      duracaoSeg: aula.duracaoSeg,
      faltaSeg: Math.max(0, aula.duracaoSeg - posicaoSeg),
      id: aula.id,
      numeroNoModulo,
      posicaoSeg,
      titulo: aula.titulo,
    },
    curso: cursoRef(item.curso),
    modulo: { numero: modulo.numero, titulo: modulo.titulo },
    progresso: progresso(item.curso, h.assistidas),
    proximoNivel: niveis(item.curso, h.assistidas).proximo?.nome ?? null,
    tipo: "continuar",
  };
}

type ComEstado<T extends EstadoCurso["tipo"]> = CursoNaTela & {
  estado: Extract<EstadoCurso, { tipo: T }>;
};

const ehEstado =
  <T extends EstadoCurso["tipo"]>(tipo: T) =>
  (x: CursoNaTela): x is ComEstado<T> =>
    x.estado.tipo === tipo;

const ultimaAtividade = (
  c: CursoCatalogo,
  atividade: ReadonlyMap<AulaId, string>
) =>
  aulasDe(c).reduce((max, a) => {
    const quando = atividade.get(a.id) ?? "";
    return quando > max ? quando : max;
  }, "");

export interface AulaDeRetomada {
  aulaId: AulaId;
  posicaoSeg: number;
}

export function aulaDeRetomada(
  curso: CursoCatalogo,
  estado: Extract<EstadoCurso, { tipo: "em_andamento" | "nao_iniciado" }>,
  h: Historico,
  atividade: ReadonlyMap<AulaId, string>
): AulaDeRetomada {
  if (estado.tipo === "nao_iniciado") {
    return { aulaId: estado.primeiraAula, posicaoSeg: 0 };
  }
  let ultima: { aulaId: AulaId; quando: string } | null = null;
  for (const aula of aulasDe(curso)) {
    const quando = atividade.get(aula.id);
    if (quando && (!ultima || quando > ultima.quando)) {
      ultima = { aulaId: aula.id, quando };
    }
  }
  const aulaId =
    ultima && !h.assistidas.has(ultima.aulaId)
      ? ultima.aulaId
      : estado.proximaAula;
  return { aulaId, posicaoSeg: h.posicoes.get(aulaId)?.posicaoSeg ?? 0 };
}

export interface OndeNoCurso {
  /** Número da aula dentro do módulo, a partir de 1. */
  aula: number;
  modulo: { numero: number; titulo: string };
}

/**
 * Onde a pessoa está no curso: a aula para onde o Continuar dela leva, a do
 * próximo questionário quando as aulas acabaram. A capa do curso em Meus cursos
 * e o acompanhamento do admin leem daqui. null quando o curso não abre aula: em
 * produção ou concluído.
 */
export function ondeNoCurso(
  curso: CursoCatalogo,
  estado: EstadoCurso,
  h: Historico,
  atividade: ReadonlyMap<AulaId, string>
): OndeNoCurso | null {
  if (estado.tipo === "em_breve" || estado.tipo === "concluido") {
    return null;
  }
  const aulaId =
    estado.tipo === "questionarios"
      ? estado.proximaAula
      : aulaDeRetomada(curso, estado, h, atividade).aulaId;
  const { modulo, numeroNoModulo } = localizar(curso, aulaId);
  return {
    aula: numeroNoModulo,
    modulo: { numero: modulo.numero, titulo: modulo.titulo },
  };
}

export function retomada({
  atividade,
  cursos,
  historico: h,
}: EntradaRetomada): Retomada | null {
  const emAndamento = cursos
    .filter(ehEstado("em_andamento"))
    .reduce<ComEstado<"em_andamento"> | null>(
      (max, x) =>
        !max ||
        ultimaAtividade(x.curso, atividade) >
          ultimaAtividade(max.curso, atividade)
          ? x
          : max,
      null
    );
  if (emAndamento) {
    const { aulaId, posicaoSeg } = aulaDeRetomada(
      emAndamento.curso,
      emAndamento.estado,
      h,
      atividade
    );
    return continuar(emAndamento, aulaId, posicaoSeg, h);
  }
  // 5: o curso com questionário pendente e a atividade mais recente.
  const comQuestionario = cursos
    .filter(ehEstado("questionarios"))
    .reduce<ComEstado<"questionarios"> | null>(
      (max, x) =>
        !max ||
        ultimaAtividade(x.curso, atividade) >
          ultimaAtividade(max.curso, atividade)
          ? x
          : max,
      null
    );
  if (comQuestionario) {
    const { curso, estado } = comQuestionario;
    const { aula, modulo, numeroNoModulo } = localizar(
      curso,
      estado.proximaAula
    );
    return {
      aula: {
        duracaoSeg: aula.duracaoSeg,
        id: aula.id,
        numeroNoModulo,
        titulo: aula.titulo,
      },
      curso: cursoRef(curso),
      modulo: { numero: modulo.numero, titulo: modulo.titulo },
      questionarios: progressoDosQuestionarios(questionariosDoCurso(curso, h)),
      tipo: "questionario",
      ultima: h.questionarios.get(aula.id)?.ultima ?? null,
    };
  }
  // 6: o primeiro curso não iniciado, na ordem da tela.
  const novo = cursos.find(ehEstado("nao_iniciado"));
  if (novo) {
    const { aula, modulo, numeroNoModulo } = localizar(
      novo.curso,
      novo.estado.primeiraAula
    );
    return {
      aula: {
        duracaoSeg: aula.duracaoSeg,
        id: aula.id,
        numeroNoModulo,
        titulo: aula.titulo,
      },
      curso: cursoRef(novo.curso),
      modulo: { numero: modulo.numero, titulo: modulo.titulo },
      tipo: "comecar",
    };
  }
  return null;
}
