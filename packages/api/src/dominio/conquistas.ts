import {
  type LinhasPainel,
  montarPainel,
  type PainelMeusCursos,
  type Retomada,
} from "./painel";
import type { MotivoPonto } from "./pontos";
import { META_SEQUENCIA, PONTOS } from "./regras";
import { diaLocal, ehDiaUtil, sequenciaDiasUteis } from "./sequencia";
import {
  type Capa,
  type CursoId,
  capaDe,
  type DiaISO,
  type LinhaDaCapa,
  type TipoEstado,
} from "./tipos";
import { type CursoDaTroca, situacao } from "./troca";

// ---------- entrada: as linhas cruas das consultas ----------

export interface LinhasDasConquistas {
  /** Toda aula assistida, também de curso revogado, com os títulos da aula e do curso. */
  assistidas: readonly {
    assistidaEm: Date;
    aula: string;
    aulaId: string;
    curso: string;
  }[];
  /** Todo certificado, também de curso revogado. */
  certificados: readonly {
    codigo: string;
    curso: LinhaDaCapa & { titulo: string };
    cursoId: string;
    emitidoEm: Date;
  }[];
  /** Os lançamentos de sequência e de troca; `curso` é o título do curso trocado. */
  lancamentos: readonly {
    criadoEm: Date;
    curso: string | null;
    motivo: MotivoPonto;
    pontos: number;
  }[];
  liberacoes: LinhasPainel["liberacoes"];
  posicoes: LinhasPainel["posicoes"];
  /** A vitrine de Trocar pontos, para o preço do curso trocável mais barato. */
  vitrine: readonly CursoDaTroca[];
}

// ---------- saída: o que a tela Conquistas mostra ----------

/** A medalha ganha leva o dia, em São Paulo, em que o fato aconteceu. */
export type Medalha<Ganha, PorGanhar> =
  | ({ estado: "ganha"; dia: DiaISO } & Ganha)
  | ({ estado: "por_ganhar" } & PorGanhar);

export interface AulaNoCurso {
  aula: string;
  curso: string;
}

export const METAS_DE_AULAS = [10, 50, 100] as const;
export type MetaDeAulas = (typeof METAS_DE_AULAS)[number];

export interface CursoPerto {
  curso: string;
  feitas: number;
  total: number;
}

/** Os marcos, sempre na ordem de `montarConquistas`, ganhos ou não. */
export type Marco =
  | {
      tipo: "primeira_aula";
      medalha: Medalha<
        AulaNoCurso,
        { proxima: (AulaNoCurso & { tipo: "comecar" | "continuar" }) | null }
      >;
    }
  | {
      tipo: "aulas";
      meta: MetaDeAulas;
      medalha: Medalha<Record<never, never>, { feitas: number }>;
    }
  | {
      tipo: "sequencia";
      medalha: Medalha<
        { vezes: number },
        { dias: number; hojePendente: boolean; meta: number }
      >;
    }
  | {
      tipo: "primeira_troca";
      medalha: Medalha<
        { curso: string; pontos: number },
        { maisBarato: number | null; pontosPorAula: number }
      >;
    }
  | {
      tipo: "primeiro_curso";
      medalha: Medalha<{ curso: string }, { maisPerto: CursoPerto | null }>;
    };

export interface CursoDoCertificado {
  capa: Capa;
  id: CursoId;
  titulo: string;
}

/**
 * Um por curso: o emitido, que fica mesmo com a liberação revogada, ou o do curso
 * de liberação ativa que ainda abre aula e não tem certificado.
 */
export type CertificadoNaTela = { curso: CursoDoCertificado } & Medalha<
  { codigo: string },
  { feitas: number; total: number }
>;

export interface Conquistas {
  /** Os emitidos pela data, depois os por ganhar na ordem de Meus cursos. */
  certificados: readonly CertificadoNaTela[];
  /** O dia em São Paulo: a data curta ganha o ano quando ele muda. */
  hoje: DiaISO;
  marcos: readonly Marco[];
}

// ---------- montagem ----------

type Ganho<T extends { estado: string }> = Extract<T, { estado: "ganha" }>;

const oMaisAntigo = <T extends { criadoEm: Date }>(
  xs: readonly T[]
): T | undefined =>
  xs.reduce<T | undefined>(
    (min, x) => (!min || x.criadoEm < min.criadoEm ? x : min),
    undefined
  );

type Assistida = LinhasDasConquistas["assistidas"][number];
type Lancamento = LinhasDasConquistas["lancamentos"][number];

function certificados(
  linhas: LinhasDasConquistas,
  painel: PainelMeusCursos
): {
  emitidos: Ganho<CertificadoNaTela>[];
  porGanhar: Extract<CertificadoNaTela, { estado: "por_ganhar" }>[];
} {
  const emitidos = [...linhas.certificados]
    .sort((a, b) => a.emitidoEm.getTime() - b.emitidoEm.getTime())
    .map((c) => ({
      codigo: c.codigo,
      curso: {
        capa: capaDe(c.curso),
        id: c.cursoId as CursoId,
        titulo: c.curso.titulo,
      },
      dia: diaLocal(c.emitidoEm),
      estado: "ganha" as const,
    }));
  const porGanhar = painel.cursos
    .filter((c) => ABREM_AULA.has(c.estado.tipo))
    .map((c) => ({
      curso: { capa: c.capa, id: c.id, titulo: c.titulo },
      estado: "por_ganhar" as const,
      feitas: c.progresso.feitas,
      total: c.progresso.total,
    }));
  return { emitidos, porGanhar };
}

/** Sem certificado e com aula para assistir: não o concluído nem o em produção. */
const ABREM_AULA: ReadonlySet<TipoEstado> = new Set([
  "nao_iniciado",
  "em_andamento",
  "prova",
]);

function primeiraAula(
  assistidas: readonly Assistida[],
  r: Retomada | null
): Marco {
  const [a] = assistidas;
  return {
    medalha: a
      ? {
          aula: a.aula,
          curso: a.curso,
          dia: diaLocal(a.assistidaEm),
          estado: "ganha",
        }
      : {
          estado: "por_ganhar",
          proxima:
            r && r.tipo !== "prova"
              ? { aula: r.aula.titulo, curso: r.curso.titulo, tipo: r.tipo }
              : null,
        },
    tipo: "primeira_aula",
  };
}

const metaDeAulas = (
  assistidas: readonly Assistida[],
  meta: MetaDeAulas
): Marco => {
  const aDaMeta = assistidas[meta - 1];
  return {
    medalha: aDaMeta
      ? { dia: diaLocal(aDaMeta.assistidaEm), estado: "ganha" }
      : { estado: "por_ganhar", feitas: assistidas.length },
    meta,
    tipo: "aulas",
  };
};

function sequencia(
  lancamentos: readonly Lancamento[],
  assistidas: readonly Assistida[],
  hoje: DiaISO
): Marco {
  const vezes = lancamentos.filter((l) => l.motivo === "sequencia_7_dias");
  const aPrimeira = oMaisAntigo(vezes);
  if (aPrimeira) {
    return {
      medalha: {
        dia: diaLocal(aPrimeira.criadoEm),
        estado: "ganha",
        vezes: vezes.length,
      },
      tipo: "sequencia",
    };
  }
  const dias = new Set(assistidas.map((a) => diaLocal(a.assistidaEm)));
  return {
    medalha: {
      dias: Math.min(sequenciaDiasUteis(dias, hoje), META_SEQUENCIA),
      estado: "por_ganhar",
      hojePendente: ehDiaUtil(hoje) && !dias.has(hoje),
      meta: META_SEQUENCIA,
    },
    tipo: "sequencia",
  };
}

function primeiraTroca(
  lancamentos: readonly Lancamento[],
  vitrine: readonly CursoDaTroca[]
): Marco {
  const aPrimeira = oMaisAntigo(
    lancamentos.filter((l) => l.motivo === "troca")
  );
  if (aPrimeira) {
    if (aPrimeira.curso === null) {
      throw new Error("Lançamento de troca sem o curso da liberação.");
    }
    return {
      medalha: {
        curso: aPrimeira.curso,
        dia: diaLocal(aPrimeira.criadoEm),
        estado: "ganha",
        pontos: -aPrimeira.pontos,
      },
      tipo: "primeira_troca",
    };
  }
  const precos = vitrine.flatMap((c) => {
    const s = situacao(c, 0);
    return s.tipo === "a_venda" ? [s.preco] : [];
  });
  return {
    medalha: {
      estado: "por_ganhar",
      maisBarato: precos.length > 0 ? Math.min(...precos) : null,
      pontosPorAula: PONTOS.aula_assistida,
    },
    tipo: "primeira_troca",
  };
}

/** O curso a que faltam menos aulas; no empate, o primeiro na ordem de Meus cursos. */
function primeiroCurso({
  emitidos,
  porGanhar,
}: ReturnType<typeof certificados>): Marco {
  const [oPrimeiro] = emitidos;
  if (oPrimeiro) {
    return {
      medalha: {
        curso: oPrimeiro.curso.titulo,
        dia: oPrimeiro.dia,
        estado: "ganha",
      },
      tipo: "primeiro_curso",
    };
  }
  const perto = porGanhar.reduce<(typeof porGanhar)[number] | null>(
    (melhor, c) =>
      !melhor || c.total - c.feitas < melhor.total - melhor.feitas ? c : melhor,
    null
  );
  return {
    medalha: {
      estado: "por_ganhar",
      maisPerto: perto
        ? {
            curso: perto.curso.titulo,
            feitas: perto.feitas,
            total: perto.total,
          }
        : null,
    },
    tipo: "primeiro_curso",
  };
}

export function montarConquistas(
  linhas: LinhasDasConquistas,
  hoje: DiaISO
): Conquistas {
  const painel = montarPainel(
    {
      assistidas: linhas.assistidas,
      certificados: linhas.certificados,
      comunicados: [],
      liberacoes: linhas.liberacoes,
      posicoes: linhas.posicoes,
    },
    hoje
  );
  const certs = certificados(linhas, painel);
  const assistidas = [...linhas.assistidas].sort(
    (a, b) => a.assistidaEm.getTime() - b.assistidaEm.getTime()
  );
  return {
    certificados: [...certs.emitidos, ...certs.porGanhar],
    hoje,
    marcos: [
      primeiraAula(assistidas, painel.retomada),
      ...METAS_DE_AULAS.map((meta) => metaDeAulas(assistidas, meta)),
      sequencia(linhas.lancamentos, assistidas, hoje),
      primeiraTroca(linhas.lancamentos, linhas.vitrine),
      primeiroCurso(certs),
    ],
  };
}
