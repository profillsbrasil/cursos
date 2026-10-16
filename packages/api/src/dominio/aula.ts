import {
  type EstadoQueAbre,
  estadoDoCurso,
  numeroDaAula,
  type Progresso,
  podeAbrir,
  progresso,
} from "./curso";
import {
  atividadeDe,
  historicoDe,
  type LinhaDoQuestionario,
  posicaoComecada,
} from "./historico";
import { type CursoLinha, paraCatalogo } from "./painel";
import {
  type MarcaDoQuestionario,
  marcaDoQuestionario,
  montarQuestionarioDaAula,
  type PerguntaComGabarito,
  type QuestionarioDaAula,
  type TentativaGravada,
} from "./questionario";
import { MARGEM_REINICIO_SEG } from "./regras";
import type {
  AulaCatalogo,
  AulaId,
  CursoCatalogo,
  DiaISO,
  Historico,
  ModuloCatalogo,
  VideoDaAula,
} from "./tipos";
import { canonizar, type Trecho, type Trechos } from "./trechos";

export interface CursoComAcessoLinha extends CursoLinha {
  liberacoes: readonly { id: string }[];
}

export interface LinhasCurso {
  assistidas: readonly { assistidaEm: Date; aulaId: string; dia: string }[];
  certificados: readonly { codigo: string; cursoId: string; emitidoEm: Date }[];
  curso: CursoComAcessoLinha | null;
  posicoes: readonly {
    atualizadaEm: Date;
    aulaId: string;
    posicaoSeg: number;
    trechosVistos: readonly Trecho[];
  }[];
  questionarios: readonly LinhaDoQuestionario[];
}

export interface CursoAberto {
  atividade: ReadonlyMap<AulaId, string>;
  curso: CursoCatalogo;
  diasComAulaAssistida: ReadonlySet<DiaISO>;
  estado: EstadoQueAbre;
  historico: Historico;
  trechos: ReadonlyMap<AulaId, readonly Trecho[]>;
}

/** null sem liberação ativa do curso ou com o curso em_breve. */
export function montarCursoAberto(linhas: LinhasCurso): CursoAberto | null {
  const linha = linhas.curso;
  if (!linha || linha.liberacoes.length === 0) {
    return null;
  }
  const comPosicao = {
    ...linhas,
    posicoes: linhas.posicoes.filter(posicaoComecada),
  };
  const historico = historicoDe(comPosicao);
  const curso = paraCatalogo(linha);
  const estado = estadoDoCurso(curso, historico);
  if (!podeAbrir(estado)) {
    return null;
  }
  return {
    atividade: atividadeDe(comPosicao),
    curso,
    diasComAulaAssistida: new Set(
      linhas.assistidas.map((a) => a.dia as DiaISO)
    ),
    estado,
    historico,
    trechos: new Map(
      linhas.posicoes.map((p) => [p.aulaId as AulaId, p.trechosVistos])
    ),
  };
}

export interface AulaNaColuna {
  assistida: boolean;
  atual: boolean;
  duracaoSeg: number;
  id: AulaId;
  questionario: MarcaDoQuestionario;
  titulo: string;
}

export interface ModuloNaColuna {
  atual: boolean;
  aulas: readonly AulaNaColuna[];
  feitas: number;
  numero: number;
  titulo: string;
}

export interface VizinhaDaAula {
  id: AulaId;
  titulo: string;
}

export interface AulaNoPlayer {
  anterior: VizinhaDaAula | null;
  aula: {
    /** "" quando o admin não escreveu. O player ainda não mostra. */
    descricao: string;
    duracaoSeg: number;
    id: AulaId;
    modulo: { numero: number; titulo: string };
    numeroNoModulo: number;
    titulo: string;
    totalNoModulo: number;
    video: VideoDaAula | null;
  };
  curso: {
    progresso: Progresso;
    slug: string;
    titulo: string;
  };
  estudo: { assistida: boolean; posicaoSeg: number; trechos: Trechos };
  modulos: readonly ModuloNaColuna[];
  proxima: VizinhaDaAula | null;
  /** null na aula sem pergunta. */
  questionario: QuestionarioDaAula | null;
}

/** O questionário da aula aberta, como a consulta o traz: o gabarito e as tentativas da pessoa. */
export interface LinhasDoQuestionario {
  perguntas: readonly PerguntaComGabarito[];
  /** Em ordem de número. */
  tentativas: readonly TentativaGravada[];
}

interface AulaNoCurso {
  aula: AulaCatalogo;
  modulo: ModuloCatalogo;
}

const aulasEmOrdem = (c: CursoCatalogo): AulaNoCurso[] =>
  c.modulos.flatMap((modulo) => modulo.aulas.map((aula) => ({ aula, modulo })));

export const aulaPorId = (c: CursoAberto, id: string): AulaCatalogo | null =>
  aulasEmOrdem(c.curso).find((x) => x.aula.id === id)?.aula ?? null;

const vizinha = (x: AulaNoCurso | undefined): VizinhaDaAula | null =>
  x ? { id: x.aula.id, titulo: x.aula.titulo } : null;

export function estudoDaAula(
  c: CursoAberto,
  aula: AulaCatalogo
): AulaNoPlayer["estudo"] {
  return {
    assistida: c.historico.assistidas.has(aula.id),
    posicaoSeg: c.historico.posicoes.get(aula.id)?.posicaoSeg ?? 0,
    trechos: canonizar(c.trechos.get(aula.id) ?? [], aula.duracaoSeg),
  };
}

export function montarAulaNoPlayer(
  c: CursoAberto,
  aula: AulaCatalogo,
  questionario: LinhasDoQuestionario
): AulaNoPlayer {
  const ordem = aulasEmOrdem(c.curso);
  const i = ordem.findIndex((x) => x.aula.id === aula.id);
  const modulo = ordem[i]?.modulo;
  if (!modulo) {
    throw new Error(`Aula ${aula.id} fora do curso ${c.curso.slug}`);
  }
  const { assistidas, questionarios } = c.historico;
  return {
    anterior: vizinha(ordem[i - 1]),
    aula: {
      descricao: aula.descricao,
      duracaoSeg: aula.duracaoSeg,
      id: aula.id,
      modulo: { numero: modulo.numero, titulo: modulo.titulo },
      numeroNoModulo: numeroDaAula(
        modulo.aulas.findIndex((a) => a.id === aula.id)
      ),
      titulo: aula.titulo,
      totalNoModulo: modulo.aulas.length,
      video: aula.video,
    },
    curso: {
      progresso: progresso(c.curso, assistidas),
      slug: c.curso.slug,
      titulo: c.curso.titulo,
    },
    estudo: estudoDaAula(c, aula),
    modulos: c.curso.modulos.map((m) => ({
      atual: m === modulo,
      aulas: m.aulas.map((a) => ({
        assistida: assistidas.has(a.id),
        atual: a.id === aula.id,
        duracaoSeg: a.duracaoSeg,
        id: a.id,
        questionario: marcaDoQuestionario(a.perguntas, questionarios.get(a.id)),
        titulo: a.titulo,
      })),
      feitas: m.aulas.filter((a) => assistidas.has(a.id)).length,
      numero: m.numero,
      titulo: m.titulo,
    })),
    proxima: vizinha(ordem[i + 1]),
    questionario: montarQuestionarioDaAula(
      questionario.perguntas,
      questionario.tentativas
    ),
  };
}

export function inicioDaAula(
  estudo: { assistida: boolean; posicaoSeg: number },
  duracaoSeg: number
): number {
  if (
    estudo.assistida ||
    estudo.posicaoSeg >= duracaoSeg - MARGEM_REINICIO_SEG
  ) {
    return 0;
  }
  return estudo.posicaoSeg;
}
