import {
  alcance,
  type CursoAlcancado,
  type Progresso,
  progresso,
} from "./curso";
import { atividadeDe, historicoDe } from "./historico";
import { PONTOS } from "./regras";
import { type CursoNaTela, ondeNoCurso, retomada } from "./retomada";
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
  type TrilhaCatalogo,
  type TrilhaId,
  type VideoProvedor,
} from "./tipos";
import { videoDaAula } from "./video";

// ---------- entrada: as linhas cruas das consultas (seção 4.3 do desenho) ----------

export interface CursoLinha extends LinhaDaCapa {
  codigo: string | null;
  destaque: string | null;
  id: string;
  modulos: {
    aulas: {
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
  tema: string;
  titulo: string;
}

export interface TrilhaLinha {
  cursos: readonly { curso: CursoLinha; posicao: number }[];
  descricao: string;
  id: string;
  slug: string;
  titulo: string;
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
  liberacoes: readonly {
    curso: CursoLinha | null;
    liberadaEm: Date;
    trilha: TrilhaLinha | null;
  }[];
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
  duracaoSeg: number;
  estado: EstadoCurso;
  extra: string | null;
  id: CursoId;
  /**
   * O módulo da aula para onde o Continuar leva (`ondeNoCurso`), o mesmo que o
   * admin lê; null quando o curso não abre aula ou espera a prova.
   */
  moduloAtual: { numero: number; titulo: string } | null;
  /** Primeiro módulo do curso, para a etiqueta "Segurança da máquina · 3 aulas · 25 min". */
  primeiroModulo: { aulas: number; duracaoSeg: number; titulo: string } | null;
  progresso: Progresso;
  slug: string;
  tema: string;
  temNiveis: boolean;
  titulo: string;
}

export interface CursoNaTrilhaVM extends CursoVM {
  posicao: number;
}

export interface TrilhaVM {
  /** Só cursos que não estão em_breve. */
  aulas: Progresso;
  concluidos: number;
  cursos: readonly CursoNaTrilhaVM[];
  daVez: CursoNaTrilhaVM | null;
  descricao: string;
  id: TrilhaId;
  situacao: "em_curso" | "aguardando_producao" | "concluida";
  slug: string;
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
      trilha: { titulo: string } | null;
    }
  | {
      tipo: "comecar";
      aula: AulaRef;
      curso: CursoRef;
      modulo: { numero: number; titulo: string };
      trilha: { titulo: string } | null;
    }
  | {
      tipo: "prova";
      curso: CursoRef;
      progresso: Progresso;
      trilha: { titulo: string } | null;
    };

/**
 * Onde Meus cursos mostra o comunicado: `topo`, numa faixa entre Sua semana e as
 * trilhas, enquanto ele tem menos de `DIAS_NO_TOPO` dias corridos; `fim`, depois.
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
  id: string;
  lugar: LugarDoComunicado;
  publicadoEm: string;
  texto: string;
  titulo: string;
}

export interface PainelMeusCursos {
  /** O mais recente visível. */
  comunicado: ComunicadoVM | null;
  /** null: "Tudo em dia". */
  retomada: Retomada | null;
  soltos: readonly CursoVM[];
  trilhas: readonly TrilhaVM[];
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
    extra: linha.codigo ?? linha.destaque,
    id: linha.id as CursoId,
    modulos: linha.modulos.map((m) => ({
      aulas: m.aulas.map((a) => ({
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
    tema: linha.tema,
    titulo: linha.titulo,
  };
}

/** Estados que abrem o curso: o curso da vez é o primeiro da trilha num deles. */
const ABRE: ReadonlySet<TipoEstado> = new Set([
  "em_andamento",
  "prova",
  "nao_iniciado",
]);

const ORDEM_SOLTOS: readonly TipoEstado[] = [
  "em_andamento",
  "prova",
  "nao_iniciado",
  "bloqueado",
  "em_breve",
  "concluido",
];

const somaSeg = (aulas: readonly { duracaoSeg: number }[]) =>
  aulas.reduce((s, a) => s + a.duracaoSeg, 0);

function cursoVM(
  c: CursoCatalogo,
  estado: EstadoCurso,
  h: Historico,
  atividade: ReadonlyMap<AulaId, string>
): CursoVM {
  const aulas = c.modulos.flatMap((m) => m.aulas);
  const [primeiro] = c.modulos;
  return {
    aulas: aulas.length,
    capa: c.capa,
    duracaoSeg: somaSeg(aulas),
    estado,
    extra: c.extra,
    id: c.id,
    moduloAtual: ondeNoCurso(c, estado, h, atividade)?.modulo ?? null,
    primeiroModulo: primeiro
      ? {
          aulas: primeiro.aulas.length,
          duracaoSeg: somaSeg(primeiro.aulas),
          titulo: primeiro.titulo,
        }
      : null,
    progresso: progresso(c, h.assistidas),
    slug: c.slug,
    tema: c.tema,
    temNiveis: c.niveis.length > 0,
    titulo: c.titulo,
  };
}

/** Borda: a trilha com os cursos em ordem de posição. */
export function paraTrilha(trilha: TrilhaLinha): TrilhaCatalogo {
  return {
    cursos: [...trilha.cursos]
      .sort((a, b) => a.posicao - b.posicao)
      .map((x) => paraCatalogo(x.curso)),
    descricao: trilha.descricao,
    id: trilha.id as TrilhaId,
    slug: trilha.slug,
    titulo: trilha.titulo,
  };
}

/** Trilhas liberadas, na ordem da liberação, sem repetir. */
function trilhasLiberadas(l: LinhasPainel): TrilhaCatalogo[] {
  const vistas = new Set<string>();
  const trilhas: TrilhaCatalogo[] = [];
  for (const { trilha } of l.liberacoes) {
    if (trilha && !vistas.has(trilha.id)) {
      vistas.add(trilha.id);
      trilhas.push(paraTrilha(trilha));
    }
  }
  return trilhas;
}

/** Uma trilha do alcance, com o estado de cada curso já decidido por `alcance`. */
export interface TrilhaAlcancada {
  cursos: readonly CursoAlcancado<CursoCatalogo>[];
  trilha: TrilhaCatalogo;
}

/** A trilha como Meus cursos mostra; o acompanhamento do admin lê a mesma. */
export function trilhaVM(
  { cursos: alcancados, trilha: t }: TrilhaAlcancada,
  h: Historico,
  atividade: ReadonlyMap<AulaId, string>
): { telas: CursoNaTela[]; vm: TrilhaVM } {
  const telas = alcancados.map((x) => ({ ...x, trilha: { titulo: t.titulo } }));
  const cursos = telas.map((x, i) => ({
    ...cursoVM(x.curso, x.estado, h, atividade),
    posicao: i + 1,
  }));
  const contaveis = cursos.filter((c) => c.estado.tipo !== "em_breve");
  const feitas = contaveis.reduce((s, c) => s + c.progresso.feitas, 0);
  const total = contaveis.reduce((s, c) => s + c.progresso.total, 0);
  const concluidos = cursos.filter((c) => c.estado.tipo === "concluido").length;
  const daVez = cursos.find((c) => ABRE.has(c.estado.tipo)) ?? null;
  let situacao: TrilhaVM["situacao"] = "aguardando_producao";
  if (cursos.length > 0 && concluidos === cursos.length) {
    situacao = "concluida";
  } else if (daVez) {
    situacao = "em_curso";
  }
  return {
    telas,
    vm: {
      aulas: {
        feitas,
        pct: total === 0 ? 0 : Math.floor((feitas * 100) / total),
        total,
      },
      concluidos,
      cursos,
      daVez,
      descricao: t.descricao,
      id: t.id,
      situacao,
      slug: t.slug,
      titulo: t.titulo,
    },
  };
}

/** `hoje` é o dia em São Paulo, e só decide o lugar do comunicado. */
export function montarPainel(
  linhas: LinhasPainel,
  hoje: DiaISO
): PainelMeusCursos {
  const h = historicoDe(linhas);
  const atividade = atividadeDe(linhas);
  const diretos = linhas.liberacoes.flatMap(({ curso }) =>
    curso ? [paraCatalogo(curso)] : []
  );
  const alcancado = alcance(trilhasLiberadas(linhas), diretos, h);

  const trilhas = alcancado.trilhas.map((t) => trilhaVM(t, h, atividade));
  // O sort é estável, então o empate fica na ordem da liberação.
  const soltosTela: CursoNaTela[] = alcancado.soltos
    .map((x) => ({ ...x, trilha: null }))
    .sort(
      (a, b) =>
        ORDEM_SOLTOS.indexOf(a.estado.tipo) -
        ORDEM_SOLTOS.indexOf(b.estado.tipo)
    );

  const telas = [...trilhas.flatMap((t) => t.telas), ...soltosTela];
  const acessiveis = new Set<string>(telas.map((x) => x.curso.id));
  const comunicado = linhas.comunicados.find(
    (c) => c.cursoId === null || acessiveis.has(c.cursoId)
  );

  return {
    comunicado: comunicado
      ? {
          id: comunicado.id,
          lugar: lugarDoComunicado(comunicado.publicadoEm, hoje),
          publicadoEm: comunicado.publicadoEm.toISOString(),
          texto: comunicado.texto,
          titulo: comunicado.titulo,
        }
      : null,
    retomada: retomada({ atividade, cursos: telas, historico: h }),
    soltos: soltosTela.map((x) => cursoVM(x.curso, x.estado, h, atividade)),
    trilhas: trilhas.map((t) => t.vm),
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
