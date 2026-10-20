// O texto dos campos lidos mora aqui, e não no input, para sobreviver quando a
// linha remonta (uma aula movida de módulo).

import {
  type AulaDoDocumento,
  type DocumentoDoCurso,
  DURACAO_MAXIMA_SEG,
  documentoDoCurso,
  LIMITES,
  PRECO_MAXIMO,
} from "@cursos/api/dominio/edicao-do-curso";
import { ALTERNATIVAS } from "@cursos/api/dominio/questionario";
import type {
  AlternativaId,
  AulaId,
  ModuloId,
  PerguntaId,
} from "@cursos/api/dominio/tipos";
import { linkCurtoDoVideo, videoDoTexto } from "@cursos/api/dominio/video";
import type { z } from "zod";

import { duracaoDoTexto, fmtNum, mmss } from "@/lib/formato";

import {
  fraseDeReserva,
  mensagemDoTexto,
  naoVazia,
  type Problema,
  type Problemas,
  semRepetir,
} from "./problemas";

export interface AlternativaDoRascunho {
  certa: boolean;
  id: AlternativaId;
  texto: string;
}

export interface PerguntaDoRascunho {
  alternativas: AlternativaDoRascunho[];
  enunciado: string;
  id: PerguntaId;
}

export interface AulaDoRascunho {
  descricao: string;
  duracao: string;
  id: AulaId;
  perguntas: PerguntaDoRascunho[];
  titulo: string;
  video: string;
}

export interface ModuloDoRascunho {
  aulas: AulaDoRascunho[];
  id: ModuloId;
  nivelOrdem: number | null;
  numero: string;
  titulo: string;
}

/** A versão não muda no editor e fica no Apoio. */
export type RascunhoDoCurso = Omit<
  DocumentoDoCurso,
  "modulos" | "precoTroca" | "versao"
> & {
  modulos: ModuloDoRascunho[];
  precoTroca: string | null;
};

const linkDoVideo = (v: AulaDoDocumento["video"]) =>
  v ? linkCurtoDoVideo(v) : "";

export function rascunhoDoCurso(d: DocumentoDoCurso): RascunhoDoCurso {
  return {
    categoriaId: d.categoriaId,
    descricao: d.descricao,
    id: d.id,
    modulos: d.modulos.map((m) => ({
      aulas: m.aulas.map((a) => ({
        descricao: a.descricao,
        duracao: a.duracaoSeg > 0 ? mmss(a.duracaoSeg) : "",
        id: a.id,
        perguntas: a.perguntas.map((p) => ({
          alternativas: p.alternativas.map((x) => ({ ...x })),
          enunciado: p.enunciado,
          id: p.id,
        })),
        titulo: a.titulo,
        video: linkDoVideo(a.video),
      })),
      id: m.id,
      nivelOrdem: m.nivelOrdem,
      numero: String(m.numero),
      titulo: m.titulo,
    })),
    niveis: d.niveis.map((n) => ({ nome: n.nome, ordem: n.ordem })),
    precoTroca: d.precoTroca === null ? null : String(d.precoTroca),
    status: d.status,
    titulo: d.titulo,
    topicos: [...d.topicos],
  };
}

export const mesmoRascunho = (a: RascunhoDoCurso, b: RascunhoDoCurso) =>
  JSON.stringify(emOrdem(a)) === JSON.stringify(emOrdem(b));

function emOrdem(r: RascunhoDoCurso) {
  return [
    r.categoriaId,
    r.descricao,
    r.id,
    r.modulos.map((m) => [
      m.id,
      m.nivelOrdem,
      m.numero,
      m.titulo,
      m.aulas.map((a) => [
        a.id,
        a.titulo,
        a.descricao,
        a.duracao,
        a.video,
        a.perguntas.map((p) => [
          p.id,
          p.enunciado,
          p.alternativas.map((x) => [x.id, x.texto, x.certa]),
        ]),
      ]),
    ]),
    r.niveis.map((n) => [n.ordem, n.nome]),
    r.precoTroca,
    r.status,
    r.titulo,
    r.topicos,
  ];
}

export type Leitura<T> = { valor: T } | { erro: string };

export function lerDuracao(texto: string): Leitura<number> {
  const seg = duracaoDoTexto(texto);
  if (seg === null) {
    return { erro: "Escreva a duração em mm:ss, como 12:30." };
  }
  return seg > DURACAO_MAXIMA_SEG
    ? { erro: `Uma aula tem no máximo ${DURACAO_MAXIMA_SEG / 3600} horas.` }
    : { valor: seg };
}

export function lerVideo(texto: string): Leitura<AulaDoDocumento["video"]> {
  if (texto.trim() === "") {
    return { valor: null };
  }
  const video = videoDoTexto(texto);
  return video
    ? { valor: video }
    : { erro: "Cole um link do YouTube ou o id do vídeo." };
}

/** Só algarismos: Number aceitaria "1e6", "0x10" e " ". */
const SO_ALGARISMOS = /^\d+$/;

const lerInteiro =
  (min: number, max: number, erro: string) =>
  (texto: string): Leitura<number> => {
    const s = texto.trim();
    const n = Number(s);
    return SO_ALGARISMOS.test(s) && n >= min && n <= max
      ? { valor: n }
      : { erro };
  };

export const lerNumeroDoModulo = lerInteiro(
  0,
  LIMITES.numeroDeModulo,
  `Use um número de 0 a ${LIMITES.numeroDeModulo}.`
);
export const lerPreco = lerInteiro(
  1,
  PRECO_MAXIMO,
  `Use um preço de 1 a ${fmtNum(PRECO_MAXIMO)} pontos.`
);

type CampoDoCursoComId = "categoriaId" | "descricao" | "precoTroca" | "titulo";

export type CampoDaAula = "descricao" | "duracao" | "titulo" | "video";
export type CampoDaPergunta = "alternativas" | "enunciado";

export const ID = {
  alternativa: (id: AlternativaId) => `alternativa-${id}`,
  aula: (id: AulaId, campo: CampoDaAula) => `aula-${id}-${campo}`,
  curso: (campo: CampoDoCursoComId | "capa") => `curso-${campo}`,
  modulo: (id: ModuloId, campo: "nivel" | "numero" | "titulo") =>
    `modulo-${id}-${campo}`,
  nivel: (ordem: number) => `nivel-${ordem}`,
  pergunta: (id: PerguntaId, campo: CampoDaPergunta) =>
    `pergunta-${id}-${campo}`,
  topico: (indice: number) => `topico-${indice}`,
};

export type RascunhoLido =
  | { tipo: "lido"; documento: DocumentoDoCurso }
  | { tipo: "problemas"; problemas: Problemas };

export const segundosDas = (aulas: readonly AulaDoRascunho[]) =>
  aulas.reduce((s, a) => {
    const lido = lerDuracao(a.duracao);
    return s + ("valor" in lido ? lido.valor : 0);
  }, 0);

const CAMPOS_DO_CURSO = new Set<string>([
  "categoriaId",
  "descricao",
  "precoTroca",
  "titulo",
] satisfies CampoDoCursoComId[]);

function campoDoCaminho(
  r: RascunhoDoCurso,
  caminho: readonly PropertyKey[]
): string | null {
  const [a, b, c, d] = caminho;
  if (caminho.length === 1 && CAMPOS_DO_CURSO.has(String(a))) {
    return ID.curso(a as CampoDoCursoComId);
  }
  if (a === "topicos" && typeof b === "number" && caminho.length === 2) {
    return ID.topico(b);
  }
  if (a === "niveis" && typeof b === "number" && c === "nome") {
    const nivel = r.niveis[b];
    return nivel ? ID.nivel(nivel.ordem) : null;
  }
  const modulo =
    a === "modulos" && typeof b === "number" ? r.modulos[b] : undefined;
  if (!modulo) {
    return null;
  }
  if (caminho.length === 3) {
    const campo = CAMPO_DO_MODULO[String(c)];
    return campo ? ID.modulo(modulo.id, campo) : null;
  }
  const aula = c === "aulas" && typeof d === "number" ? modulo.aulas[d] : null;
  return aula ? campoNaAula(aula, caminho.slice(4)) : null;
}

function campoNaAula(
  aula: AulaDoRascunho,
  resto: readonly PropertyKey[]
): string | null {
  const [e, f, g, h, i] = resto;
  if (resto.length === 1) {
    const campo = CAMPO_DA_AULA[String(e)];
    return campo ? ID.aula(aula.id, campo) : null;
  }
  const pergunta =
    e === "perguntas" && typeof f === "number" ? aula.perguntas[f] : null;
  if (!pergunta) {
    return null;
  }
  if (resto.length === 3 && (g === "alternativas" || g === "enunciado")) {
    return ID.pergunta(pergunta.id, g);
  }
  const alternativa =
    g === "alternativas" && typeof h === "number"
      ? pergunta.alternativas[h]
      : null;
  return alternativa && resto.length === 5 && i === "texto"
    ? ID.alternativa(alternativa.id)
    : null;
}

const CAMPO_DO_MODULO: Record<string, "nivel" | "numero" | "titulo"> = {
  aulas: "titulo",
  nivelOrdem: "nivel",
  numero: "numero",
  titulo: "titulo",
};

const CAMPO_DA_AULA: Record<string, CampoDaAula> = {
  descricao: "descricao",
  duracaoSeg: "duracao",
  titulo: "titulo",
  video: "video",
};

const NOME_DA_LISTA: Record<string, string> = {
  alternativas: "alternativas",
  aulas: "aulas por módulo",
  modulos: "módulos",
  niveis: "níveis",
  perguntas: "perguntas por aula",
  topicos: "tópicos",
};

export const MINIMO_DE_ALTERNATIVAS = `Toda pergunta tem pelo menos ${ALTERNATIVAS.min} alternativas.`;

function mensagemDaIssue(i: z.core.$ZodIssue, temCampo: boolean): string {
  if (i.code === "custom") {
    return i.message;
  }
  const doTexto = mensagemDoTexto(i);
  if (doTexto !== null) {
    return doTexto;
  }
  if (i.code === "too_big" && i.origin === "array") {
    const lista = NOME_DA_LISTA[String(i.path.at(-1))] ?? "itens";
    return `O limite é de ${fmtNum(Number(i.maximum))} ${lista}.`;
  }
  if (i.code === "too_small" && i.path.at(-1) === "alternativas") {
    return MINIMO_DE_ALTERNATIVAS;
  }
  if (temCampo) {
    return "Confira este campo.";
  }
  return fraseDeReserva(i.path);
}

export function lerRascunho(
  r: RascunhoDoCurso,
  salvo: Pick<DocumentoDoCurso, "versao">
): RascunhoLido {
  const problemas: Problema[] = [];
  const ler = <T>(leitura: Leitura<T>, campo: string, substituto: T): T => {
    if ("valor" in leitura) {
      return leitura.valor;
    }
    problemas.push({ campo, mensagem: leitura.erro });
    return substituto;
  };
  const documento = {
    ...r,
    modulos: r.modulos.map((m, i) => ({
      aulas: m.aulas.map((a) => ({
        descricao: a.descricao,
        duracaoSeg: ler(lerDuracao(a.duracao), ID.aula(a.id, "duracao"), 1),
        id: a.id,
        perguntas: a.perguntas,
        titulo: a.titulo,
        video: ler(lerVideo(a.video), ID.aula(a.id, "video"), null),
      })),
      id: m.id,
      nivelOrdem: m.nivelOrdem,
      // Negativo e único: o zod marca este campo, sem acusar número repetido.
      numero: ler(
        lerNumeroDoModulo(m.numero),
        ID.modulo(m.id, "numero"),
        -1 - i
      ),
      titulo: m.titulo,
    })),
    precoTroca:
      r.precoTroca === null
        ? null
        : ler(lerPreco(r.precoTroca), ID.curso("precoTroca"), 1),
    versao: salvo.versao,
  };
  const lido = documentoDoCurso.safeParse(documento);
  if (!lido.success) {
    for (const issue of lido.error.issues) {
      const campo = campoDoCaminho(r, issue.path);
      problemas.push({
        campo,
        mensagem: mensagemDaIssue(issue, campo !== null),
      });
    }
  }
  if (naoVazia(problemas)) {
    return { problemas: semRepetir(problemas), tipo: "problemas" };
  }
  if (!lido.success) {
    return {
      problemas: [{ campo: null, mensagem: fraseDeReserva([]) }],
      tipo: "problemas",
    };
  }
  return { documento: lido.data, tipo: "lido" };
}
