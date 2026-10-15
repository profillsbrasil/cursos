import {
  type CursoNaTela,
  estadoDoCurso,
  type Progresso,
  progresso,
} from "./curso";
import { atividadeDe, historicoDe } from "./historico";
import { PONTOS } from "./regras";
import { ondeNoCurso, retomada } from "./retomada";
import {
  type DiaDaSemana,
  diaLocal,
  diasCorridos,
  faltamParaBonus,
  semana,
  sequenciaDiasUteis,
} from "./sequencia";
import {
  type AulaId,
  type Capa,
  type CursoCatalogo,
  type CursoId,
  capaDe,
  type DiaISO,
  type EstadoCurso,
  type Historico,
  type LinhaDaCapa,
  type StatusDoCurso,
  type TipoEstado,
  type VideoProvedor,
} from "./tipos";
import { videoDaAula } from "./video";

// ---------- entrada: as linhas cruas das consultas (seção 4.3 do desenho) ----------

export interface CursoLinha extends LinhaDaCapa {
  categoria: { nome: string };
  codigo: string | null;
  descricao: string;
  destaque: string | null;
  id: string;
  modulos: {
    aulas: {
      descricao: string;
      duracaoSeg: number;
      id: string;
      posicao: number;
      titulo: string;
      videoId: string | null;
      videoProvedor: VideoProvedor | null;
    }[];
    nivelOrdem: number | null;
    numero: number;
    titulo: string;
  }[];
  niveis: { nome: string; ordem: number }[];
  slug: string;
  status: StatusDoCurso;
  titulo: string;
  topicos: string[];
}

export interface LinhasPainel {
  assistidas: readonly { assistidaEm: Date; aulaId: string }[];
  certificados: readonly { codigo: string; cursoId: string; emitidoEm: Date }[];
  comunicados: readonly {
    cursoId: string | null;
    id: string;
    publicadoEm: Date;
    texto: string;
    titulo: string;
  }[];
  /** Liberações ativas em ordem de liberadaEm. */
  liberacoes: readonly { curso: CursoLinha; liberadaEm: Date }[];
  posicoes: readonly {
    atualizadaEm: Date;
    aulaId: string;
    posicaoSeg: number;
  }[];
}

export interface LinhasResumo {
  dias: readonly { dia: string }[];
  pontos: { saldo: number; entradasDaSemana: number };
}

// ---------- saída: o view model da tela ----------

export interface CursoVM {
  aulas: number;
  capa: Capa;
  categoria: string;
  duracaoSeg: number;
  estado: EstadoCurso;
  extra: string | null;
  id: CursoId;
  /**
   * O módulo da aula para onde o Continuar leva (`ondeNoCurso`), o mesmo que o
   * admin lê; null quando o curso não abre aula ou espera a prova.
   */
  moduloAtual: { numero: number; titulo: string } | null;
  progresso: Progresso;
  slug: string;
  temNiveis: boolean;
  titulo: string;
}

interface CursoRef {
  capa: Capa;
  slug: string;
  titulo: string;
}

interface AulaRef {
  duracaoSeg: number;
  id: AulaId;
  numeroNoModulo: number;
  titulo: string;
}

export type Retomada =
  | {
      tipo: "continuar";
      aula: AulaRef & { posicaoSeg: number; faltaSeg: number };
      curso: CursoRef;
      modulo: { numero: number; titulo: string };
      progresso: Progresso;
      proximoNivel: string | null;
    }
  | {
      tipo: "comecar";
      aula: AulaRef;
      curso: CursoRef;
      modulo: { numero: number; titulo: string };
    }
  | {
      tipo: "prova";
      curso: CursoRef;
      progresso: Progresso;
    };

/**
 * Onde Meus cursos mostra o comunicado: `topo`, numa faixa entre Sua semana e os
 * cursos, enquanto ele tem menos de `DIAS_NO_TOPO` dias corridos; `fim`, depois.
 */
export type LugarDoComunicado = "topo" | "fim";

export const DIAS_NO_TOPO = 14;

/** Os dias contam no fuso de São Paulo: o dia da publicação é o dia 0. */
export const lugarDoComunicado = (
  publicadoEm: Date,
  hoje: DiaISO
): LugarDoComunicado =>
  diasCorridos(diaLocal(publicadoEm), hoje) < DIAS_NO_TOPO ? "topo" : "fim";

export interface ComunicadoVM {
  /** O dia em São Paulo em que o painel foi montado: a data curta leva o ano quando ele muda. */
  hoje: DiaISO;
  id: string;
  lugar: LugarDoComunicado;
  publicadoEm: string;
  texto: string;
  titulo: string;
}

export interface PainelMeusCursos {
  /** O mais recente visível. */
  comunicado: ComunicadoVM | null;
  /** Os cursos liberados, pela ORDEM_DOS_CURSOS e, no empate, pela liberação. */
  cursos: readonly CursoVM[];
  /** null: "Tudo em dia". */
  retomada: Retomada | null;
}

export interface ResumoAluno {
  bonus: number;
  /** Segunda a domingo. */
  dias: readonly DiaDaSemana[];
  /** 1 a 7. */
  faltamParaBonus: number;
  pontosSemana: number;
  saldo: number;
  sequenciaDias: number;
}

// ---------- montagem ----------

/** Borda: marca os ids das linhas do banco. */
export function paraCatalogo(linha: CursoLinha): CursoCatalogo {
  return {
    capa: capaDe(linha),
    categoria: linha.categoria.nome,
    descricao: linha.descricao,
    extra: linha.codigo ?? linha.destaque,
    id: linha.id as CursoId,
    modulos: linha.modulos.map((m) => ({
      aulas: m.aulas.map((a) => ({
        descricao: a.descricao,
        duracaoSeg: a.duracaoSeg,
        id: a.id as AulaId,
        posicao: a.posicao,
        titulo: a.titulo,
        video: videoDaAula(a.videoProvedor, a.videoId),
      })),
      nivelOrdem: m.nivelOrdem,
      numero: m.numero,
      titulo: m.titulo,
    })),
    niveis: linha.niveis,
    slug: linha.slug,
    status: linha.status,
    titulo: linha.titulo,
    topicos: linha.topicos,
  };
}

const ORDEM_DOS_CURSOS: Record<TipoEstado, number> = {
  concluido: 4,
  em_andamento: 0,
  em_breve: 3,
  nao_iniciado: 2,
  prova: 1,
};

const somaSeg = (aulas: readonly { duracaoSeg: number }[]) =>
  aulas.reduce((s, a) => s + a.duracaoSeg, 0);

function cursoVM(
  c: CursoCatalogo,
  estado: EstadoCurso,
  h: Historico,
  atividade: ReadonlyMap<AulaId, string>
): CursoVM {
  const aulas = c.modulos.flatMap((m) => m.aulas);
  return {
    aulas: aulas.length,
    capa: c.capa,
    categoria: c.categoria,
    duracaoSeg: somaSeg(aulas),
    estado,
    extra: c.extra,
    id: c.id,
    moduloAtual: ondeNoCurso(c, estado, h, atividade)?.modulo ?? null,
    progresso: progresso(c, h.assistidas),
    slug: c.slug,
    temNiveis: c.niveis.length > 0,
    titulo: c.titulo,
  };
}

/** `hoje` é o dia em São Paulo, e só serve ao comunicado: o lugar e o ano da data. */
export function montarPainel(
  linhas: LinhasPainel,
  hoje: DiaISO
): PainelMeusCursos {
  const h = historicoDe(linhas);
  const atividade = atividadeDe(linhas);
  const liberados = linhas.liberacoes.map(({ curso }) => paraCatalogo(curso));
  // O sort é estável, então o empate fica na ordem da liberação.
  const telas: CursoNaTela[] = liberados
    .map((curso) => ({ curso, estado: estadoDoCurso(curso, h) }))
    .sort(
      (a, b) =>
        ORDEM_DOS_CURSOS[a.estado.tipo] - ORDEM_DOS_CURSOS[b.estado.tipo]
    );
  const acessiveis = new Set<string>(telas.map((x) => x.curso.id));
  const comunicado = linhas.comunicados.find(
    (c) => c.cursoId === null || acessiveis.has(c.cursoId)
  );

  return {
    comunicado: comunicado
      ? {
          hoje,
          id: comunicado.id,
          lugar: lugarDoComunicado(comunicado.publicadoEm, hoje),
          publicadoEm: comunicado.publicadoEm.toISOString(),
          texto: comunicado.texto,
          titulo: comunicado.titulo,
        }
      : null,
    cursos: telas.map((x) => cursoVM(x.curso, x.estado, h, atividade)),
    retomada: retomada({ atividade, cursos: telas, historico: h }),
  };
}

export function montarResumo(linhas: LinhasResumo, hoje: DiaISO): ResumoAluno {
  const dias = new Set(linhas.dias.map((d) => d.dia as DiaISO));
  const sequenciaDias = sequenciaDiasUteis(dias, hoje);
  return {
    bonus: PONTOS.sequencia_7_dias,
    dias: semana(dias, hoje),
    faltamParaBonus: faltamParaBonus(sequenciaDias),
    pontosSemana: linhas.pontos.entradasDaSemana,
    saldo: linhas.pontos.saldo,
    sequenciaDias,
  };
}
