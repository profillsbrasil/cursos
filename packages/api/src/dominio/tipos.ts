import type { AulaId, CursoId, VideoId } from "@cursos/db/marcas";
import type { videoProvedor } from "@cursos/db/schema/comum";
import type {
  ORIGEM_DA_LIBERACAO,
  STATUS_DO_CURSO,
} from "@cursos/db/schema/formatos";

import type { Papel } from "../context";

export { STATUS_DO_CURSO } from "@cursos/db/schema/formatos";

export type {
  AdminId,
  AlternativaId,
  AulaId,
  CategoriaId,
  CodigoDoCertificado,
  ComunicadoId,
  ConviteId,
  CursoId,
  DiaISO,
  Email,
  LiberacaoDoPerfilId,
  LiberacaoId,
  MaterialId,
  ModuloId,
  PerguntaId,
  TentativaId,
  Trecho,
  Trechos,
  Versao,
  VideoId,
} from "@cursos/db/marcas";

/** Uma pessoa do Clerk, como o admin a vê. O Clerk é a tabela de usuários. */
export interface Pessoa {
  email: string | null;
  foto: string | null;
  /** O rótulo de exibição: o nome, ou o username, o e-mail ou o userId que o substitui. */
  nome: string;
  /** O nome que a pessoa escreveu na conta (o `fullName` do Clerk); null quando ela não escreveu. */
  nomeProprio: string | null;
  userId: string;
}

/** Os jeitos de entrar que a ficha da pessoa mostra. */
export type JeitoDeEntrar = "google" | "senha";

/** A Pessoa com o que o Clerk sabe da conta dela. */
export interface Conta extends Pessoa {
  criadaEm: Date;
  /** O e-mail principal passou pela verificação do Clerk. */
  emailVerificado: boolean;
  jeitosDeEntrar: readonly JeitoDeEntrar[];
  /** O Public metadata `papel`; qualquer outro valor vale aluno, como no claim. */
  papel: Papel;
  /** null: nunca entrou. */
  ultimoAcesso: Date | null;
}

/** A página da busca como o Clerk a devolve, com a conta inteira de cada um. */
export interface BuscaDeContas extends ResultadoDaBusca {
  pessoas: readonly Conta[];
}

/** Uma página da busca de pessoas, e quantas casaram no total. */
export interface ResultadoDaBusca {
  pessoas: readonly Pessoa[];
  total: number;
}

export type VideoProvedor = (typeof videoProvedor.enumValues)[number];

export type OrigemDaLiberacao = (typeof ORIGEM_DA_LIBERACAO)[number];

/** De onde vem o acesso a um curso, como o admin lê: a liberação da pessoa ou a do perfil dela. */
export type OrigemDoAcesso = OrigemDaLiberacao | "perfil";

export type StatusDoCurso = (typeof STATUS_DO_CURSO)[number];

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
