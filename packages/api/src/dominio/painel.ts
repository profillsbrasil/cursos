import {
  estadoDoCurso,
  estadosDaTrilha,
  type Progresso,
  progresso,
} from "./curso";
import { atividadeDe, historicoDe } from "./historico";
import { PONTOS } from "./regras";
import { type CursoNaTela, retomada } from "./retomada";
import {
  type DiaDaSemana,
  faltamParaBonus,
  semana,
  sequenciaDiasUteis,
} from "./sequencia";
import type {
  AulaId,
  CursoCatalogo,
  CursoId,
  DiaISO,
  EstadoCurso,
  Historico,
  TipoEstado,
  TrilhaCatalogo,
  TrilhaId,
  VideoProvedor,
} from "./tipos";
import { videoDaAula } from "./video";

// ---------- entrada: as linhas cruas das consultas (seção 4.3 do desenho) ----------

export interface CursoLinha {
  capaAlt: string;
  capaUrl: string;
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
  status: "em_producao" | "publicado";
  tema: string;
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
    trilha: {
      cursos: { curso: CursoLinha; posicao: number }[];
      descricao: string;
      id: string;
      slug: string;
      titulo: string;
    } | null;
  }[];
  posicoes: readonly {
    atualizadaEm: Date;
    aulaId: string;
    posicaoSeg: number;
  }[];
}

export interface LinhasResumo {
  dias: readonly { dia: string }[];
  pontos: { saldo: number; semana: number };
}

// ---------- saída: o view model da tela ----------

export interface CursoVM {
  aulas: number;
  capa: { url: string; alt: string };
  duracaoSeg: number;
  estado: EstadoCurso;
  extra: string | null;
  id: CursoId;
  /** Primeiro módulo pendente; null com todas as aulas assistidas. */
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
  capa: { url: string; alt: string };
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

export interface ComunicadoVM {
  id: string;
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
    capa: { alt: linha.capaAlt, url: linha.capaUrl },
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

function cursoVM(c: CursoCatalogo, estado: EstadoCurso, h: Historico): CursoVM {
  const aulas = c.modulos.flatMap((m) => m.aulas);
  const atual = c.modulos.find((m) =>
    m.aulas.some((a) => !h.assistidas.has(a.id))
  );
  const [primeiro] = c.modulos;
  return {
    aulas: aulas.length,
    capa: c.capa,
    duracaoSeg: somaSeg(aulas),
    estado,
    extra: c.extra,
    id: c.id,
    moduloAtual: atual ? { numero: atual.numero, titulo: atual.titulo } : null,
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

/** Trilhas liberadas, na ordem da liberação, sem repetir. */
function trilhasLiberadas(l: LinhasPainel): TrilhaCatalogo[] {
  const vistas = new Set<string>();
  const trilhas: TrilhaCatalogo[] = [];
  for (const { trilha } of l.liberacoes) {
    if (trilha && !vistas.has(trilha.id)) {
      vistas.add(trilha.id);
      trilhas.push({
        cursos: [...trilha.cursos]
          .sort((a, b) => a.posicao - b.posicao)
          .map((x) => paraCatalogo(x.curso)),
        descricao: trilha.descricao,
        id: trilha.id as TrilhaId,
        slug: trilha.slug,
        titulo: trilha.titulo,
      });
    }
  }
  return trilhas;
}

function trilhaVM(
  t: TrilhaCatalogo,
  h: Historico,
  liberadosDireto: ReadonlySet<CursoId>
): { telas: CursoNaTela[]; vm: TrilhaVM } {
  const estados = estadosDaTrilha(t, h, liberadosDireto);
  const telas = t.cursos.map((curso, i) => ({
    curso,
    estado: estados[i] ?? ({ tipo: "em_breve" } as const),
    trilha: { titulo: t.titulo },
  }));
  const cursos = telas.map((x, i) => ({
    ...cursoVM(x.curso, x.estado, h),
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

export function montarPainel(linhas: LinhasPainel): PainelMeusCursos {
  const h = historicoDe(linhas);
  const trilhasCat = trilhasLiberadas(linhas);
  const naTrilha = new Set(
    trilhasCat.flatMap((t) => t.cursos.map((c) => c.id))
  );
  const diretos = new Map<CursoId, CursoCatalogo>();
  for (const { curso } of linhas.liberacoes) {
    if (curso && !diretos.has(curso.id as CursoId)) {
      diretos.set(curso.id as CursoId, paraCatalogo(curso));
    }
  }
  const liberadosDireto = new Set(diretos.keys());

  const trilhas = trilhasCat.map((t) => trilhaVM(t, h, liberadosDireto));
  // Soltos: liberação direta fora de trilha liberada. O sort é estável, então
  // o empate fica na ordem da liberação.
  const soltosTela: CursoNaTela[] = [...diretos.values()]
    .filter((c) => !naTrilha.has(c.id))
    .map((curso) => ({
      curso,
      estado: estadoDoCurso(curso, h, { tipo: "livre" }),
      trilha: null,
    }))
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
          publicadoEm: comunicado.publicadoEm.toISOString(),
          texto: comunicado.texto,
          titulo: comunicado.titulo,
        }
      : null,
    retomada: retomada({
      atividade: atividadeDe(linhas),
      cursos: telas,
      historico: h,
    }),
    soltos: soltosTela.map((x) => cursoVM(x.curso, x.estado, h)),
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
    pontosSemana: linhas.pontos.semana,
    saldo: linhas.pontos.saldo,
    sequenciaDias,
  };
}
