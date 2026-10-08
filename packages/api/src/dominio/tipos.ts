import type { videoProvedor } from "@cursos/db/schema/comum";
import type {
  ORIGEM_DA_LIBERACAO,
  STATUS_DO_CURSO,
} from "@cursos/db/schema/formatos";

declare const marca: unique symbol;
type Marca<T, M extends string> = T & { readonly [marca]: M };

export type CursoId = Marca<string, "CursoId">;
export type AulaId = Marca<string, "AulaId">;
export type ModuloId = Marca<string, "ModuloId">;
/** Impressão do conteúdo de um documento do admin (dominio/versao.ts). */
export type Versao = Marca<string, "Versao">;
export type TrilhaId = Marca<string, "TrilhaId">;
export type LiberacaoId = Marca<string, "LiberacaoId">;
export type ComunicadoId = Marca<string, "ComunicadoId">;
/** "2026-10-07": dia civil de São Paulo. */
export type DiaISO = Marca<string, "DiaISO">;
/** userId de quem passou pelo adminProcedure. Só o middleware cria um. */
export type AdminId = Marca<string, "AdminId">;

/** Uma pessoa do Clerk, como o admin a vê. O Clerk é a tabela de usuários. */
export interface Pessoa {
  email: string | null;
  foto: string | null;
  nome: string;
  userId: string;
}

/** Uma página da busca de pessoas, e quantas casaram no total. */
export interface ResultadoDaBusca {
  pessoas: readonly Pessoa[];
  total: number;
}

export type VideoProvedor = (typeof videoProvedor.enumValues)[number];
export type OrigemDaLiberacao = (typeof ORIGEM_DA_LIBERACAO)[number];
export type StatusDoCurso = (typeof STATUS_DO_CURSO)[number];
export type VideoId = Marca<string, "VideoId">;

export type VideoDaAula = {
  [P in VideoProvedor]: { id: VideoId; provedor: P };
}[VideoProvedor];

export interface AulaCatalogo {
  duracaoSeg: number;
  id: AulaId;
  posicao: number;
  titulo: string;
  /** null: aula ainda sem vídeo publicado. */
  video: VideoDaAula | null;
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

/** Largura e altura são a medida real da imagem, para o next/image reservar o espaço. */
export interface Capa {
  alt: string;
  altura: number;
  largura: number;
  url: string;
}

/** As colunas da capa como saem do banco (COLUNAS_DA_CAPA). */
export interface LinhaDaCapa {
  capaAlt: string;
  capaAltura: number;
  capaLargura: number;
  capaUrl: string;
}

export const capaDe = (linha: LinhaDaCapa): Capa => ({
  alt: linha.capaAlt,
  altura: linha.capaAltura,
  largura: linha.capaLargura,
  url: linha.capaUrl,
});

export interface CursoCatalogo {
  capa: Capa;
  /** codigo ?? destaque */
  extra: string | null;
  id: CursoId;
  /** Em ordem de número, aulas em ordem de posição. */
  modulos: readonly ModuloCatalogo[];
  /** Em ordem. */
  niveis: readonly NivelCatalogo[];
  slug: string;
  status: StatusDoCurso;
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
