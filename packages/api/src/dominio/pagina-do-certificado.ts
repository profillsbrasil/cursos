import type { CursoAberto } from "./aula";
import type { Pessoa } from "./tipos";

export interface CertificadoEmitido {
  codigo: string;
  emitidoEm: string;
  horas: number;
  /** null quando o Clerk não tem um nome para mostrar: a conta sumiu ou só tem e-mail. */
  nome: string | null;
  tituloDoCurso: string;
}

export type PaginaDoCertificado =
  | {
      tipo: "emitido";
      categoria: string;
      certificado: CertificadoEmitido;
      slug: string;
    }
  | {
      tipo: "falta";
      aulas: { feitas: number; total: number };
      curso: { slug: string; titulo: string };
      questionarios: { aprovados: number; total: number };
    };

export interface LinhaDoCertificado {
  categoria: string;
  codigo: string;
  emitidoEm: Date;
  segundosDeVideo: number;
  slug: string;
  tituloDoCurso: string;
  userId: string;
}

const SEGUNDOS_POR_HORA = 3600;

export const cargaHoraria = (segundos: number) =>
  Math.ceil(segundos / SEGUNDOS_POR_HORA);

export function nomeNoCertificado(p: Pessoa | null): string | null {
  if (!p || p.nome === p.userId || p.nome === p.email) {
    return null;
  }
  return p.nome;
}

export const certificadoEmitido = (
  l: LinhaDoCertificado,
  pessoa: Pessoa | null
): CertificadoEmitido => ({
  codigo: l.codigo,
  emitidoEm: l.emitidoEm.toISOString(),
  horas: cargaHoraria(l.segundosDeVideo),
  nome: nomeNoCertificado(pessoa),
  tituloDoCurso: l.tituloDoCurso,
});

export const paginaEmitida = (
  l: LinhaDoCertificado,
  pessoa: Pessoa | null
): PaginaDoCertificado => ({
  categoria: l.categoria,
  certificado: certificadoEmitido(l, pessoa),
  slug: l.slug,
  tipo: "emitido",
});

export function paginaQueFalta(c: CursoAberto): PaginaDoCertificado {
  const { progresso, questionarios } = c.leitura;
  return {
    aulas: { feitas: progresso.feitas, total: progresso.total },
    curso: { slug: c.curso.slug, titulo: c.curso.titulo },
    questionarios: {
      aprovados: questionarios.feitas,
      total: questionarios.total,
    },
    tipo: "falta",
  };
}
