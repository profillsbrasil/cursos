// O curso como o admin edita: um documento só (campos do curso, níveis, módulos e
// aulas), salvo de uma vez. Roda no editor e no servidor, então nada aqui importa
// node:crypto, banco ou Clerk. O planejador, que só roda no servidor, mora em
// plano-do-curso.ts.

// formatos.ts, não comum.ts: este módulo vai para o bundle do browser.
import {
  ID_DO_YOUTUBE,
  SLUG,
  STATUS_DO_CURSO,
} from "@cursos/db/schema/formatos";
import { z } from "zod";

import type {
  AulaId,
  Capa,
  CursoId,
  ModuloId,
  TrilhaId,
  Versao,
  VideoDaAula,
  VideoId,
} from "./tipos";

/** O formato do slug, para o editor conferir no campo (o app não importa @cursos/db). */
export const FORMATO_DO_SLUG = SLUG;

/**
 * Tetos do documento. gravarCurso deriva deles o deslocamento que regrava números
 * e posições sem colidir nos uniques não deferrable.
 */
export const LIMITES = {
  aulasPorModulo: 500,
  modulos: 200,
  niveis: 50,
  numeroDeModulo: 999,
} as const;

/** Tetos de texto, em caracteres, que o schema e os campos do editor dividem. */
export const CARACTERES = {
  capaAlt: 300,
  codigo: 40,
  destaque: 60,
  nomeDoNivel: 60,
  slug: 80,
  tema: 80,
  titulo: 120,
  tituloDaAula: 160,
  tituloDoModulo: 160,
} as const;

export const DURACAO_MAXIMA_SEG = 24 * 60 * 60;
export const PRECO_MAXIMO = 1_000_000;

const texto = (max: number) => z.string().trim().min(1).max(max);
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

const aula = z.object({
  duracaoSeg: z.int().positive().max(DURACAO_MAXIMA_SEG),
  /** Aula nova: o editor gera o id. A posição é o índice no módulo mais 1. */
  id: uuid.transform((id) => id as AulaId),
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
    capaAlt: texto(CARACTERES.capaAlt),
    codigo: opcional(CARACTERES.codigo),
    destaque: opcional(CARACTERES.destaque),
    id: uuid.transform((id) => id as CursoId),
    modulos: z.array(modulo).max(LIMITES.modulos),
    niveis: z.array(nivel).max(LIMITES.niveis),
    precoTroca: z.int().positive().max(PRECO_MAXIMO).nullable(),
    slug: z.string().regex(new RegExp(SLUG)).max(CARACTERES.slug),
    status: z.enum(STATUS_DO_CURSO),
    tema: texto(CARACTERES.tema),
    titulo: texto(CARACTERES.titulo),
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
    const aulas = d.modulos.flatMap((m) => m.aulas.map((a) => a.id));
    for (const id of repetidos(aulas)) {
      falha(`Aula ${id} aparece duas vezes.`, ["modulos"]);
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
  /** Liberações diretas, ativas ou revogadas: a FK restrict conta as duas. */
  liberacoes: number;
  trilha: { id: TrilhaId; titulo: string } | null;
}

export interface EdicaoDoCurso {
  /** null só no curso novo, antes do primeiro salvamento. */
  capa: Capa | null;
  documento: DocumentoDoCurso;
  podeApagar: boolean;
  uso: UsoDoCurso;
}

const SEM_USO: UsoDoCurso = {
  assistidasPorAula: {},
  certificados: 0,
  liberacoes: 0,
  trilha: null,
};

/** Única regra de "dá para apagar o curso". A tela e apagarCurso usam esta. */
export const podeApagarCurso = (u: UsoDoCurso): boolean =>
  u.certificados === 0 &&
  u.liberacoes === 0 &&
  u.trilha === null &&
  Object.values(u.assistidasPorAula).every((n) => n === 0);

/**
 * O rascunho de um curso que ainda não existe. O id vem de quem chama e não pode
 * mudar enquanto o rascunho vive: a trava curso:<id> e o reenvio sem duplicar
 * dependem dele.
 */
export function edicaoDeCursoNovo(id: CursoId): EdicaoDoCurso {
  return {
    capa: null,
    documento: {
      capaAlt: "",
      codigo: null,
      destaque: null,
      id,
      modulos: [],
      niveis: [],
      precoTroca: null,
      slug: "",
      status: "em_producao",
      tema: "",
      titulo: "",
      versao: null,
    },
    podeApagar: false,
    uso: SEM_USO,
  };
}
