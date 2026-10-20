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
export type PerguntaId = Marca<string, "PerguntaId">;
export type AlternativaId = Marca<string, "AlternativaId">;
/** Uma tentativa do questionário de uma aula. O id nasce no cliente. */
export type TentativaId = Marca<string, "TentativaId">;
/** Impressão do conteúdo de um documento do admin (dominio/versao.ts). */
export type Versao = Marca<string, "Versao">;
export type LiberacaoId = Marca<string, "LiberacaoId">;
export type ComunicadoId = Marca<string, "ComunicadoId">;
export type CategoriaId = Marca<string, "CategoriaId">;
/** Um arquivo do material de apoio do curso. O id nasce no editor. */
export type MaterialId = Marca<string, "MaterialId">;
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
  /** "" quando o admin não escreveu. */
  descricao: string;
  duracaoSeg: number;
  id: AulaId;
  /** Quantas perguntas o questionário da aula tem; 0 é aula sem questionário. */
  perguntas: number;
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
  categoria: string;
  codigo: string;
  /** "" quando o admin não escreveu. */
  descricao: string;
  id: CursoId;
  /** Em ordem de número, aulas em ordem de posição. */
  modulos: readonly ModuloCatalogo[];
  /** Em ordem. */
  niveis: readonly NivelCatalogo[];
  slug: string;
  status: StatusDoCurso;
  titulo: string;
  /** "O que você vai aprender", em ordem. */
  topicos: readonly string[];
}

/** O que ficou das tentativas da pessoa no questionário de uma aula. */
export interface EstudoDoQuestionario {
  aprovada: boolean;
  tentativas: number;
  /** A nota da última tentativa. */
  ultima: { acertos: number; total: number };
}

export interface Historico {
  assistidas: ReadonlySet<AulaId>;
  certificados: ReadonlyMap<CursoId, { codigo: string; emitidoEm: string }>;
  posicoes: ReadonlyMap<AulaId, { posicaoSeg: number; atualizadaEm: string }>;
  /** Só as aulas em que a pessoa já enviou alguma tentativa. */
  questionarios: ReadonlyMap<AulaId, EstudoDoQuestionario>;
}

/** `questionarios`: todas as aulas assistidas e questionário por aprovar; a regra é lerCursoDoAluno. */
export type EstadoCurso =
  | { tipo: "em_breve" }
  | { tipo: "nao_iniciado"; primeiraAula: AulaId }
  | { tipo: "em_andamento"; proximaAula: AulaId }
  | {
      tipo: "questionarios";
      aprovados: number;
      proximaAula: AulaId;
      total: number;
    }
  | { tipo: "concluido"; certificado: { codigo: string; emitidoEm: string } };

export type TipoEstado = EstadoCurso["tipo"];
