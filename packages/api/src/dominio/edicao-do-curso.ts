// O curso como o admin edita: um documento só (campos do curso, níveis, módulos e
// aulas), salvo de uma vez. Roda no editor e no servidor, então nada aqui importa
// node:crypto, banco ou Clerk. O único escritor do que o documento descreve é
// consultas/edicao-do-curso.ts, a partir do Plano de planejarCurso.

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
import { versaoDe } from "./versao";

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

const texto = (max: number) => z.string().trim().min(1).max(max);
/** "" vira null: campo opcional apagado no formulário. */
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((s) => (s ? s : null));

const video = z
  .object({
    id: z.string().regex(new RegExp(ID_DO_YOUTUBE)),
    provedor: z.literal("youtube"),
  })
  .transform(
    (v): VideoDaAula => ({ id: v.id as VideoId, provedor: v.provedor })
  );

const aula = z.object({
  duracaoSeg: z.int().positive().max(86_400),
  /** Aula nova: o editor gera o id. A posição é o índice no módulo mais 1. */
  id: z.uuid().transform((id) => id as AulaId),
  titulo: texto(160),
  video: video.nullable(),
});

const modulo = z.object({
  aulas: z.array(aula).max(LIMITES.aulasPorModulo),
  id: z.uuid().transform((id) => id as ModuloId),
  nivelOrdem: z.int().min(1).max(LIMITES.niveis).nullable(),
  /** O número que o aluno vê ("Módulo 3"). O seed começa em 0 ou em 1; buracos valem. */
  numero: z.int().min(0).max(LIMITES.numeroDeModulo),
  titulo: texto(160),
});

const nivel = z.object({
  nome: texto(60),
  ordem: z.int().min(1).max(LIMITES.niveis),
});

function repetidos<T>(valores: readonly T[]): T[] {
  return [...new Set(valores.filter((v, i) => valores.indexOf(v) !== i))];
}

export const documentoDoCurso = z
  .object({
    capaAlt: texto(300),
    codigo: opcional(40),
    destaque: opcional(60),
    id: z.uuid().transform((id) => id as CursoId),
    modulos: z.array(modulo).max(LIMITES.modulos),
    niveis: z.array(nivel).max(LIMITES.niveis),
    precoTroca: z.int().positive().max(1_000_000).nullable(),
    slug: z.string().regex(new RegExp(SLUG)).max(80),
    status: z.enum(STATUS_DO_CURSO),
    tema: texto(80),
    titulo: texto(120),
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
  });

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

/** "modulos.2.aulas.0.titulo" vira "Módulo 3, aula 1, titulo". */
function caminhoLegivel(path: readonly PropertyKey[]): string {
  const partes: string[] = [];
  for (const chave of path) {
    const anterior = partes.at(-1);
    if (
      typeof chave === "number" &&
      (anterior === "modulos" || anterior === "aulas")
    ) {
      partes[partes.length - 1] =
        `${anterior === "modulos" ? "Módulo" : "aula"} ${chave + 1}`;
    } else {
      partes.push(String(chave));
    }
  }
  return partes.join(", ");
}

/** Servidor: o inverso de formularioDoCurso. Arquivo vazio conta como sem capa. */
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
    const [issue] = lido.error.issues;
    return {
      mensagem: issue
        ? `${caminhoLegivel(issue.path)}: ${issue.message}`
        : "Documento inválido.",
      tipo: "invalido",
    };
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

/** /admin/catalogo/cursos/novo: o id vem de quem chama, a versão é null. */
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

export type RecusaDaEdicao =
  | { tipo: "versao_mudou" }
  | { tipo: "sumiu" }
  | { tipo: "sem_capa" }
  | { tipo: "aula_assistida"; titulo: string; alunos: number };

export interface Apagar {
  aulas: readonly AulaId[];
  modulos: readonly ModuloId[];
  niveis: readonly number[];
}

/** Ids do documento que o curso ainda não tem: entram por INSERT, o resto por UPDATE. */
export interface Novos {
  aulas: readonly AulaId[];
  modulos: readonly ModuloId[];
}

export type Plano =
  | { tipo: "nada_mudou" }
  | {
      tipo: "gravar";
      criar: boolean;
      documento: DocumentoDoCurso;
      apagar: Apagar;
      novos: Novos;
    }
  | { tipo: "recusa"; recusa: RecusaDaEdicao };

const recusa = (r: RecusaDaEdicao): Plano => ({ recusa: r, tipo: "recusa" });

const idsDosModulos = (d: DocumentoDoCurso) => d.modulos.map((m) => m.id);
const idsDasAulas = (d: DocumentoDoCurso) =>
  d.modulos.flatMap((m) => m.aulas.map((a) => a.id));
const fora = <T>(lista: readonly T[], de: readonly T[]) => {
  const conjunto = new Set(de);
  return lista.filter((x) => !conjunto.has(x));
};

/**
 * `atual` é o que abrirCurso leu com o curso travado. O plano descreve o estado
 * final; gravarCurso escreve o documento inteiro. Aqui só se decide o que some e
 * se pode sumir. Aula que muda de módulo mantém o id, então mantém assistidas e
 * posição do aluno.
 */
export function planejarCurso(
  atual: EdicaoDoCurso | null,
  desejado: DocumentoDoCurso,
  temCapaNova: boolean
): Plano {
  if (atual === null) {
    if (desejado.versao !== null) {
      return recusa({ tipo: "sumiu" });
    }
    if (!temCapaNova) {
      return recusa({ tipo: "sem_capa" });
    }
    return {
      apagar: { aulas: [], modulos: [], niveis: [] },
      criar: true,
      documento: desejado,
      novos: { aulas: idsDasAulas(desejado), modulos: idsDosModulos(desejado) },
      tipo: "gravar",
    };
  }
  // Antes da versão: duplo clique e reenvio depois de resposta perdida são sucesso.
  if (!temCapaNova && versaoDe(desejado) === atual.documento.versao) {
    return { tipo: "nada_mudou" };
  }
  if (desejado.versao !== atual.documento.versao) {
    return recusa({ tipo: "versao_mudou" });
  }
  const aulasQueSaem = fora(
    idsDasAulas(atual.documento),
    idsDasAulas(desejado)
  );
  for (const id of aulasQueSaem) {
    const alunos = atual.uso.assistidasPorAula[id] ?? 0;
    if (alunos > 0) {
      const titulo =
        atual.documento.modulos.flatMap((m) => m.aulas).find((a) => a.id === id)
          ?.titulo ?? id;
      return recusa({ alunos, tipo: "aula_assistida", titulo });
    }
  }
  return {
    apagar: {
      aulas: aulasQueSaem,
      modulos: fora(idsDosModulos(atual.documento), idsDosModulos(desejado)),
      niveis: fora(
        atual.documento.niveis.map((n) => n.ordem),
        desejado.niveis.map((n) => n.ordem)
      ),
    },
    criar: false,
    documento: desejado,
    novos: {
      aulas: fora(idsDasAulas(desejado), idsDasAulas(atual.documento)),
      modulos: fora(idsDosModulos(desejado), idsDosModulos(atual.documento)),
    },
    tipo: "gravar",
  };
}
