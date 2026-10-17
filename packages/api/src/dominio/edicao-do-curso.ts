// O curso como o admin edita: um documento só (campos do curso, níveis, módulos e
// aulas), salvo de uma vez. Roda no editor e no servidor, então nada aqui importa
// node:crypto, banco ou Clerk. O planejador, que só roda no servidor, mora em
// plano-do-curso.ts.

// formatos.ts, não comum.ts: este módulo vai para o bundle do browser.
import { ID_DO_YOUTUBE, STATUS_DO_CURSO } from "@cursos/db/schema/formatos";
import { z } from "zod";

import { ALTERNATIVAS } from "./questionario";
import type {
  AlternativaId,
  AulaId,
  Capa,
  CategoriaId,
  CursoId,
  ModuloId,
  PerguntaId,
  Versao,
  VideoDaAula,
  VideoId,
} from "./tipos";

/**
 * Tetos do documento. gravarCurso deriva deles o deslocamento que regrava números
 * e posições sem colidir nos uniques não deferrable.
 */
export const LIMITES = {
  aulasPorModulo: 500,
  modulos: 200,
  niveis: 50,
  numeroDeModulo: 999,
  perguntasPorAula: 20,
  /** O check curso_topicos_validos repete este teto. */
  topicos: 10,
} as const;

export const CARACTERES = {
  alternativa: 200,
  categoria: 80,
  codigo: 40,
  descricao: 2000,
  descricaoDaAula: 2000,
  destaque: 60,
  enunciado: 500,
  nomeDoNivel: 60,
  slug: 80,
  titulo: 120,
  tituloDaAula: 160,
  tituloDoModulo: 160,
  topico: 120,
} as const;

export const SEM_CERTA = "Marque a alternativa certa: clique na letra dela.";

export const DURACAO_MAXIMA_SEG = 24 * 60 * 60;
export const PRECO_MAXIMO = 1_000_000;

const texto = (max: number) => z.string().trim().min(1).max(max);
/** Texto que pode ficar vazio: a descrição do curso e a da aula. */
const livre = (max: number) => z.string().trim().max(max);
/** "" vira null: campo opcional apagado no formulário. */
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((s) => (s ? s : null));

/** O Postgres devolve uuid em minúscula; o mesmo id em outra caixa seria outra linha. */
const uuid = z.uuid().transform((id) => id.toLowerCase());

const video = z
  .object({
    id: z.string().regex(new RegExp(ID_DO_YOUTUBE)),
    provedor: z.literal("youtube"),
  })
  .transform(
    (v): VideoDaAula => ({ id: v.id as VideoId, provedor: v.provedor })
  );

const alternativa = z.object({
  certa: z.boolean(),
  id: uuid.transform((id) => id as AlternativaId),
  texto: texto(CARACTERES.alternativa),
});

const pergunta = z
  .object({
    alternativas: z
      .array(alternativa)
      .min(ALTERNATIVAS.min)
      .max(ALTERNATIVAS.max),
    enunciado: texto(CARACTERES.enunciado),
    id: uuid.transform((id) => id as PerguntaId),
  })
  .superRefine((p, ctx) => {
    if (p.alternativas.filter((a) => a.certa).length !== 1) {
      ctx.addIssue({
        code: "custom",
        message: SEM_CERTA,
        path: ["alternativas"],
      });
    }
  });

const aula = z.object({
  descricao: livre(CARACTERES.descricaoDaAula),
  duracaoSeg: z.int().positive().max(DURACAO_MAXIMA_SEG),
  /** Aula nova: o editor gera o id. A posição é o índice no módulo mais 1. */
  id: uuid.transform((id) => id as AulaId),
  perguntas: z.array(pergunta).max(LIMITES.perguntasPorAula),
  titulo: texto(CARACTERES.tituloDaAula),
  video: video.nullable(),
});

const modulo = z.object({
  aulas: z.array(aula).max(LIMITES.aulasPorModulo),
  id: uuid.transform((id) => id as ModuloId),
  nivelOrdem: z.int().min(1).max(LIMITES.niveis).nullable(),
  /** O número que o aluno vê ("Módulo 3"). O seed começa em 0 ou em 1; buracos valem. */
  numero: z.int().min(0).max(LIMITES.numeroDeModulo),
  titulo: texto(CARACTERES.tituloDoModulo),
});

const nivel = z.object({
  nome: texto(CARACTERES.nomeDoNivel),
  ordem: z.int().min(1).max(LIMITES.niveis),
});

function repetidos<T>(valores: readonly T[]): T[] {
  const vistos = new Set<T>();
  const repetido = new Set<T>();
  for (const v of valores) {
    (vistos.has(v) ? repetido : vistos).add(v);
  }
  return [...repetido];
}

const porNumero = (a: { numero: number }, b: { numero: number }) =>
  a.numero - b.numero;
const porOrdem = (a: { ordem: number }, b: { ordem: number }) =>
  a.ordem - b.ordem;

/**
 * Sai na forma que abrirCurso lê do banco: módulos por número, níveis por ordem,
 * ids em minúscula. Assim a versão do que chegou é a versão do que fica gravado.
 * A ordem das aulas é conteúdo: é a posição.
 */
export const documentoDoCurso = z
  .object({
    /** Uma categoria de admin.categorias.lista; o servidor recusa a que sumiu. */
    categoriaId: uuid.transform((id) => id as CategoriaId),
    codigo: opcional(CARACTERES.codigo),
    descricao: livre(CARACTERES.descricao),
    destaque: opcional(CARACTERES.destaque),
    id: uuid.transform((id) => id as CursoId),
    modulos: z.array(modulo).max(LIMITES.modulos),
    niveis: z.array(nivel).max(LIMITES.niveis),
    precoTroca: z.int().positive().max(PRECO_MAXIMO).nullable(),
    status: z.enum(STATUS_DO_CURSO),
    titulo: texto(CARACTERES.titulo),
    /** "O que você vai aprender", na ordem em que o aluno lê. */
    topicos: z.array(texto(CARACTERES.topico)).max(LIMITES.topicos),
    /** null: o editor acha que o curso é novo. Senão, a versão que ele abriu. */
    versao: z
      .string()
      .nullable()
      .transform((v) => v as Versao | null),
  })
  .superRefine((d, ctx) => {
    const falha = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: "custom", message, path });
    for (const n of repetidos(d.modulos.map((m) => m.numero))) {
      falha(`Dois módulos com o número ${n}.`, ["modulos"]);
    }
    for (const id of repetidos(d.modulos.map((m) => m.id))) {
      falha(`Módulo ${id} aparece duas vezes.`, ["modulos"]);
    }
    const aulas = d.modulos.flatMap((m) => m.aulas);
    for (const id of repetidos(aulas.map((a) => a.id))) {
      falha(`Aula ${id} aparece duas vezes.`, ["modulos"]);
    }
    const perguntas = aulas.flatMap((a) => a.perguntas);
    for (const id of repetidos(perguntas.map((p) => p.id))) {
      falha(`Pergunta ${id} aparece duas vezes.`, ["modulos"]);
    }
    const alternativas = perguntas.flatMap((p) => p.alternativas);
    for (const id of repetidos(alternativas.map((a) => a.id))) {
      falha(`Alternativa ${id} aparece duas vezes.`, ["modulos"]);
    }
    for (const o of repetidos(d.niveis.map((n) => n.ordem))) {
      falha(`Dois níveis com a ordem ${o}.`, ["niveis"]);
    }
    const ordens = new Set(d.niveis.map((n) => n.ordem));
    d.modulos.forEach((m, i) => {
      if (m.nivelOrdem !== null && !ordens.has(m.nivelOrdem)) {
        falha(`O nível ${m.nivelOrdem} não existe.`, [
          "modulos",
          i,
          "nivelOrdem",
        ]);
      }
    });
  })
  .transform((d) => ({
    ...d,
    modulos: d.modulos.toSorted(porNumero),
    niveis: d.niveis.toSorted(porOrdem),
  }));

export type DocumentoDoCurso = z.output<typeof documentoDoCurso>;
export type ModuloDoDocumento = DocumentoDoCurso["modulos"][number];
export type AulaDoDocumento = ModuloDoDocumento["aulas"][number];
export type PerguntaDoDocumento = AulaDoDocumento["perguntas"][number];
export type AlternativaDoDocumento =
  PerguntaDoDocumento["alternativas"][number];

/** Nome dos campos do FormData de admin.catalogo.salvarCurso. */
const CAMPO = { capa: "capa", documento: "documento" } as const;

/** Cliente: o corpo de admin.catalogo.salvarCurso. */
export function formularioDoCurso(
  documento: DocumentoDoCurso,
  capa: Blob | null
): FormData {
  const fd = new FormData();
  fd.set(CAMPO.documento, JSON.stringify(documento));
  if (capa) {
    fd.set(CAMPO.capa, capa);
  }
  return fd;
}

export type FormularioLido =
  | { tipo: "lido"; documento: DocumentoDoCurso; capa: Blob | null }
  | { tipo: "invalido"; mensagem: string };

/**
 * Servidor: o inverso de formularioDoCurso. Arquivo vazio conta como sem capa.
 * O editor valida com o mesmo schema antes de enviar, então documento inválido
 * aqui é defeito ou envio forjado, e a frase não detalha.
 */
export function lerFormularioDoCurso(fd: FormData): FormularioLido {
  const json = fd.get(CAMPO.documento);
  if (typeof json !== "string") {
    return { mensagem: "O formulário veio sem o documento.", tipo: "invalido" };
  }
  let bruto: unknown;
  try {
    bruto = JSON.parse(json);
  } catch {
    return { mensagem: "O documento não é JSON.", tipo: "invalido" };
  }
  const lido = documentoDoCurso.safeParse(bruto);
  if (!lido.success) {
    return { mensagem: "Documento inválido.", tipo: "invalido" };
  }
  const capa = fd.get(CAMPO.capa);
  return {
    capa: capa instanceof Blob && capa.size > 0 ? capa : null,
    documento: lido.data,
    tipo: "lido",
  };
}

export interface UsoDoCurso {
  /** Alunos com aula assistida, por aula. Aula ausente: ninguém assistiu. */
  assistidasPorAula: Readonly<Record<string, number>>;
  certificados: number;
  /** Liberações, ativas ou revogadas: a FK restrict conta as duas. */
  liberacoes: number;
  /** Alunos que enviaram alguma tentativa do questionário, por aula. */
  tentativasPorAula: Readonly<Record<string, number>>;
}

export interface EdicaoDoCurso {
  /** null só no curso novo, antes do primeiro salvamento. */
  capa: Capa | null;
  documento: DocumentoDoCurso;
  podeApagar: boolean;
  /**
   * O endereço que o servidor escolheu no primeiro salvamento, a partir do título,
   * e que não muda depois. null no curso novo.
   */
  slug: string | null;
  uso: UsoDoCurso;
}

const SEM_USO: UsoDoCurso = {
  assistidasPorAula: {},
  certificados: 0,
  liberacoes: 0,
  tentativasPorAula: {},
};

/** Única regra de "dá para apagar o curso". A tela e apagarCurso usam esta. */
export const podeApagarCurso = (u: UsoDoCurso): boolean =>
  u.certificados === 0 &&
  u.liberacoes === 0 &&
  Object.values(u.assistidasPorAula).every((n) => n === 0) &&
  Object.values(u.tentativasPorAula).every((n) => n === 0);

/** O curso novo ainda sem categoria escolhida; o schema recusa o id vazio. */
const SEM_CATEGORIA = "" as CategoriaId;

/**
 * O rascunho de um curso que ainda não existe. O id vem de quem chama e não pode
 * mudar enquanto o rascunho vive: a trava curso:<id> e o reenvio sem duplicar
 * dependem dele.
 */
export function edicaoDeCursoNovo(id: CursoId): EdicaoDoCurso {
  return {
    capa: null,
    documento: {
      categoriaId: SEM_CATEGORIA,
      codigo: null,
      descricao: "",
      destaque: null,
      id,
      modulos: [],
      niveis: [],
      precoTroca: null,
      status: "em_producao",
      titulo: "",
      topicos: [],
      versao: null,
    },
    podeApagar: false,
    slug: null,
    uso: SEM_USO,
  };
}
