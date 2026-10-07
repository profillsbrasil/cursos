declare const marca: unique symbol;
type Marca<T, M extends string> = T & { readonly [marca]: M };

export type CursoId = Marca<string, "CursoId">;
export type AulaId = Marca<string, "AulaId">;
export type TrilhaId = Marca<string, "TrilhaId">;
/** "2026-10-07": dia civil de São Paulo. */
export type DiaISO = Marca<string, "DiaISO">;

export interface AulaCatalogo {
  duracaoSeg: number;
  id: AulaId;
  posicao: number;
  titulo: string;
}

export interface ModuloCatalogo {
  aulas: readonly AulaCatalogo[];
  nivelOrdem: number | null;
  numero: number;
  titulo: string;
}

export interface NivelCatalogo {
  nome: string;
  ordem: number;
}

export interface CursoCatalogo {
  capa: { url: string; alt: string };
  /** codigo ?? destaque */
  extra: string | null;
  id: CursoId;
  /** Em ordem de número, aulas em ordem de posição. */
  modulos: readonly ModuloCatalogo[];
  /** Em ordem. */
  niveis: readonly NivelCatalogo[];
  slug: string;
  status: "em_producao" | "publicado";
  tema: string;
  titulo: string;
}

export interface TrilhaCatalogo {
  /** Em ordem de posição. */
  cursos: readonly CursoCatalogo[];
  descricao: string;
  id: TrilhaId;
  slug: string;
  titulo: string;
}

export interface Historico {
  assistidas: ReadonlySet<AulaId>;
  certificados: ReadonlyMap<CursoId, { codigo: string; emitidoEm: string }>;
  posicoes: ReadonlyMap<AulaId, { posicaoSeg: number; atualizadaEm: string }>;
}

export type Antecessor =
  | { tipo: "livre" } // primeiro da trilha, curso solto ou liberação direta
  | {
      tipo: "na_trilha";
      curso: { id: CursoId; titulo: string };
      concluido: boolean;
    };

export type EstadoCurso =
  | { tipo: "em_breve" }
  | { tipo: "bloqueado"; liberadoPor: { id: CursoId; titulo: string } }
  | { tipo: "nao_iniciado"; primeiraAula: AulaId }
  | { tipo: "em_andamento"; proximaAula: AulaId }
  | { tipo: "prova" }
  | { tipo: "concluido"; certificado: { codigo: string; emitidoEm: string } };

export type TipoEstado = EstadoCurso["tipo"];
