import {
  type EstadoQueAbre,
  estadoDoCurso,
  estadosDaTrilha,
  numeroDaAula,
  type Progresso,
  podeAbrir,
  progresso,
} from "./curso";
import { atividadeDe, historicoDe, posicaoComecada } from "./historico";
import { type CursoLinha, paraCatalogo } from "./painel";
import { MARGEM_REINICIO_SEG } from "./regras";
import { aulaDeRetomada } from "./retomada";
import type {
  AulaCatalogo,
  AulaId,
  CursoCatalogo,
  CursoId,
  DiaISO,
  Historico,
  ModuloCatalogo,
  TrilhaId,
  VideoDaAula,
} from "./tipos";
import { canonizar, type Trecho, type Trechos } from "./trechos";

export interface CursoComAcessoLinha extends CursoLinha {
  liberacoes: readonly { id: string }[];
  naTrilha: {
    trilha: {
      cursos: readonly { curso: CursoLinha; posicao: number }[];
      descricao: string;
      id: string;
      liberacoes: readonly { id: string }[];
      slug: string;
      titulo: string;
    };
  } | null;
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
}

export interface CursoAberto {
  atividade: ReadonlyMap<AulaId, string>;
  curso: CursoCatalogo;
  diasComAulaAssistida: ReadonlySet<DiaISO>;
  estado: EstadoQueAbre;
  historico: Historico;
  trechos: ReadonlyMap<AulaId, readonly Trecho[]>;
}

/**
 * null sem liberação ativa (direta ou pela trilha) ou com o curso em_breve ou
 * bloqueado.
 */
export function montarCursoAberto(linhas: LinhasCurso): CursoAberto | null {
  const linha = linhas.curso;
  if (!linha) {
    return null;
  }
  const direto = linha.liberacoes.length > 0;
  const trilhaLinha = linha.naTrilha?.trilha;
  const pelaTrilha = (trilhaLinha?.liberacoes.length ?? 0) > 0;
  if (!(direto || pelaTrilha)) {
    return null;
  }
  const comPosicao = {
    ...linhas,
    posicoes: linhas.posicoes.filter(posicaoComecada),
  };
  const historico = historicoDe(comPosicao);
  const curso = paraCatalogo(linha);
  let estado = estadoDoCurso(curso, historico, { tipo: "livre" });
  if (trilhaLinha && pelaTrilha) {
    const cursos = [...trilhaLinha.cursos]
      .sort((a, b) => a.posicao - b.posicao)
      .map((x) => paraCatalogo(x.curso));
    const estados = estadosDaTrilha(
      {
        cursos,
        descricao: trilhaLinha.descricao,
        id: trilhaLinha.id as TrilhaId,
        slug: trilhaLinha.slug,
        titulo: trilhaLinha.titulo,
      },
      historico,
      new Set<CursoId>(direto ? [curso.id] : [])
    );
    estado = estados[cursos.findIndex((c) => c.id === curso.id)] ?? estado;
  }
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
  aula: AulaCatalogo
): AulaNoPlayer {
  const ordem = aulasEmOrdem(c.curso);
  const i = ordem.findIndex((x) => x.aula.id === aula.id);
  const modulo = ordem[i]?.modulo;
  if (!modulo) {
    throw new Error(`Aula ${aula.id} fora do curso ${c.curso.slug}`);
  }
  const { assistidas } = c.historico;
  return {
    anterior: vizinha(ordem[i - 1]),
    aula: {
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
        titulo: a.titulo,
      })),
      feitas: m.aulas.filter((a) => assistidas.has(a.id)).length,
      numero: m.numero,
      titulo: m.titulo,
    })),
    proxima: vizinha(ordem[i + 1]),
  };
}

export type EntradaDoCurso =
  | { aulaId: AulaId; tipo: "aula" }
  | { primeira: AulaId; tipo: "prova" | "concluido" };

export function entradaDoCurso(c: CursoAberto): EntradaDoCurso {
  const { estado } = c;
  if (estado.tipo === "em_andamento" || estado.tipo === "nao_iniciado") {
    const { aulaId } = aulaDeRetomada(
      c.curso,
      estado,
      c.historico,
      c.atividade
    );
    return { aulaId, tipo: "aula" };
  }
  const primeira = aulasEmOrdem(c.curso)[0]?.aula.id;
  if (!primeira) {
    throw new Error(`Curso ${c.curso.slug} aberto sem aulas`);
  }
  return { primeira, tipo: estado.tipo };
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
