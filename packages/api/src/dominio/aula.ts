import {
  aulaDeAmostra,
  type EstadoQueAbre,
  numeroDaAula,
  type Progresso,
  podeAbrir,
} from "./curso";
import { type CursoDoAluno, lerCursoDoAluno } from "./curso-do-aluno";
import { estudoDe, type LinhaDoQuestionario } from "./historico";
import { type CursoLinha, paraCatalogo } from "./painel";
import {
  type MarcaDoQuestionario,
  marcaDoQuestionario,
  montarQuestionarioDaAula,
  type PerguntaComGabarito,
  type QuestionarioDaAula,
  SEM_QUESTIONARIO,
  type TentativaGravada,
} from "./questionario";
import { MARGEM_REINICIO_SEG } from "./regras";
import type {
  AulaCatalogo,
  AulaId,
  CursoCatalogo,
  CursoId,
  DiaISO,
  Historico,
  ModuloCatalogo,
  VideoDaAula,
} from "./tipos";
import { canonizar, type Trecho, type Trechos } from "./trechos";

export interface CursoComAcessoLinha extends CursoLinha {
  liberacoes: readonly { id: string }[];
  liberacoesDoPerfil: readonly { id: string }[];
  precoTroca: number | null;
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

/**
 * A amostra: a pessoa vê o curso só pela liberação do perfil, sem liberação
 * própria ativa (do admin ou de troca). Só a aula de amostra abre.
 */
export interface Amostra {
  aulaId: AulaId;
  /** O preço de troca do curso; null no curso publicado antes da regra do preço. */
  preco: number | null;
}

export interface CursoAberto {
  /** null: o curso inteiro, pela liberação própria ativa. */
  amostra: Amostra | null;
  curso: CursoCatalogo;
  diasComAulaAssistida: ReadonlySet<DiaISO>;
  historico: Historico;
  leitura: CursoDoAluno & { estado: EstadoQueAbre };
  trechos: ReadonlyMap<AulaId, readonly Trecho[]>;
}

/**
 * O curso que a pessoa vê, inteiro ou como amostra. null sem liberação ativa
 * do curso, própria ou do perfil, ou com o curso em_breve.
 */
export function montarCursoVisto(linhas: LinhasCurso): CursoAberto | null {
  const linha = linhas.curso;
  if (
    !linha ||
    linha.liberacoes.length + linha.liberacoesDoPerfil.length === 0
  ) {
    return null;
  }
  const estudo = estudoDe(linhas);
  const curso = paraCatalogo(linha);
  const leitura = lerCursoDoAluno(curso, estudo);
  const { estado } = leitura;
  const primeira = aulaDeAmostra(curso);
  if (!(podeAbrir(estado) && primeira)) {
    return null;
  }
  return {
    amostra:
      linha.liberacoes.length > 0
        ? null
        : { aulaId: primeira, preco: linha.precoTroca },
    curso,
    diasComAulaAssistida: new Set(
      linhas.assistidas.map((a) => a.dia as DiaISO)
    ),
    historico: estudo.historico,
    leitura: { ...leitura, estado },
    trechos: new Map(
      linhas.posicoes.map((p) => [p.aulaId as AulaId, p.trechosVistos])
    ),
  };
}

/**
 * Só o curso inteiro: a porta do questionário, do material de apoio e da página
 * do certificado. A amostra não abre nenhum deles.
 */
export function montarCursoAberto(linhas: LinhasCurso): CursoAberto | null {
  const visto = montarCursoVisto(linhas);
  return visto && visto.amostra === null ? visto : null;
}

/** Se a aula toca: toda aula do curso inteiro, só a aula de amostra na amostra. */
export const abreAAula = (c: CursoAberto, aulaId: string): boolean =>
  c.amostra === null || c.amostra.aulaId === aulaId;

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

/** O que o player mostra na aula de amostra: a troca no fim do vídeo. */
export interface AmostraNoPlayer {
  cursoId: CursoId;
  preco: number | null;
  /** A aula seguinte, fechada até a troca; null no curso de uma aula. */
  proxima: VizinhaDaAula | null;
  saldo: number;
}

export interface AulaNoPlayer {
  /** null fora da amostra. */
  amostra: AmostraNoPlayer | null;
  anterior: VizinhaDaAula | null;
  aula: {
    /** "" quando o admin não escreveu, e aí o player não mostra a linha. */
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
  /** null na última aula e na amostra, em que a próxima aula está fechada. */
  proxima: VizinhaDaAula | null;
  /** null na aula sem pergunta e na amostra. */
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

/** `saldo` só pesa na amostra, para o convite de troca do fim do vídeo. */
export function montarAulaNoPlayer(
  c: CursoAberto,
  aula: AulaCatalogo,
  questionario: LinhasDoQuestionario,
  saldo: number
): AulaNoPlayer {
  const ordem = aulasEmOrdem(c.curso);
  const i = ordem.findIndex((x) => x.aula.id === aula.id);
  const modulo = ordem[i]?.modulo;
  if (!modulo) {
    throw new Error(`Aula ${aula.id} fora do curso ${c.curso.slug}`);
  }
  const { assistidas, questionarios } = c.historico;
  const proxima = vizinha(ordem[i + 1]);
  return {
    amostra: c.amostra && {
      cursoId: c.curso.id,
      preco: c.amostra.preco,
      proxima,
      saldo,
    },
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
      progresso: c.leitura.progresso,
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
        questionario: c.amostra
          ? SEM_QUESTIONARIO
          : marcaDoQuestionario(a.perguntas, questionarios.get(a.id)),
        titulo: a.titulo,
      })),
      feitas: m.aulas.filter((a) => assistidas.has(a.id)).length,
      numero: m.numero,
      titulo: m.titulo,
    })),
    proxima: c.amostra ? null : proxima,
    questionario: c.amostra
      ? null
      : montarQuestionarioDaAula(
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
