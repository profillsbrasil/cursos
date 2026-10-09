// O rascunho da trilha e as regras da lista de cursos, sem React: a tela só
// despacha a mudança e desenha.

import type { Motivo } from "@cursos/api";
import type { CursoNaVisao } from "@cursos/api/dominio/catalogo";
import {
  type DocumentoDaTrilha,
  documentoDaTrilha,
  LIMITES_DA_TRILHA,
  type UsoDaTrilha,
} from "@cursos/api/dominio/edicao-da-trilha";
import type { CursoId, TrilhaId } from "@cursos/api/dominio/tipos";
import type { Combobox } from "@cursos/ui/components/combobox";
import type { ComponentProps } from "react";
import type { z } from "zod";
import { type Direcao, setaDepoisDeMover, trocado } from "@/lib/editor";
import type { RegrasDoRascunho } from "@/lib/use-rascunho-apoiado";

import {
  fraseDeReserva,
  mensagemDoTexto,
  type Problema,
  type Problemas,
  type Recusa,
  recusaNaTela,
  semRepetir,
} from "./problemas";

/**
 * Um curso que saiu da lista neste rascunho. `antesDe` é o curso que vinha logo
 * depois dele quando saiu (null: era o último); o Desfazer o devolve ali.
 */
export interface Tirado {
  antesDe: CursoId | null;
  id: CursoId;
}

/** O que o admin edita. Id e versão não mudam no editor e ficam no Apoio. */
export type RascunhoDaTrilha = Pick<
  DocumentoDaTrilha,
  "cursos" | "descricao" | "slug" | "titulo"
> & {
  /** Em ordem de saída. Não vai ao servidor nem conta para o sujo. */
  tirados: readonly Tirado[];
};
export type CampoDaTrilha = "descricao" | "slug" | "titulo";

export type MudancaDaTrilha =
  | {
      tipo: "campos";
      mudanca: Partial<Pick<RascunhoDaTrilha, CampoDaTrilha>>;
    }
  | { tipo: "curso_acrescentado"; id: CursoId }
  | { tipo: "curso_movido"; id: CursoId; direcao: Direcao }
  | { tipo: "curso_tirado"; id: CursoId }
  | { tipo: "curso_devolvido"; id: CursoId };

export const rascunhoDaTrilha = (d: DocumentoDaTrilha): RascunhoDaTrilha => ({
  cursos: d.cursos,
  descricao: d.descricao,
  slug: d.slug,
  tirados: [],
  titulo: d.titulo,
});

/**
 * Os cursos e os tirados na ordem da tela: cada tirado volta para antes do
 * curso que vinha depois dele, do último a sair para o primeiro, que é a ordem
 * que reconstrói a lista de antes de cada saída.
 */
function ordemComTirados(r: RascunhoDaTrilha): CursoId[] {
  const ids = [...r.cursos];
  for (const t of r.tirados.toReversed()) {
    const i = t.antesDe === null ? -1 : ids.indexOf(t.antesDe);
    ids.splice(i < 0 ? ids.length : i, 0, t.id);
  }
  return ids;
}

export type LinhaDaLista =
  | { tipo: "curso"; id: CursoId; posicao: number }
  | { tipo: "tirado"; id: CursoId };

/**
 * As linhas da lista. O tirado que estava na lista salva fica no lugar dele,
 * riscado; o que entrou e saiu neste rascunho some, porque não é perda.
 */
export function linhasDaLista(
  r: RascunhoDaTrilha,
  salvo: readonly CursoId[]
): LinhaDaLista[] {
  let posicao = 0;
  return ordemComTirados(r).flatMap((id): LinhaDaLista[] => {
    if (r.cursos.includes(id)) {
      posicao += 1;
      return [{ id, posicao, tipo: "curso" }];
    }
    return salvo.includes(id) ? [{ id, tipo: "tirado" }] : [];
  });
}

const semTirado = (r: RascunhoDaTrilha, id: CursoId) =>
  r.tirados.filter((t) => t.id !== id);

function devolvido(r: RascunhoDaTrilha, id: CursoId): RascunhoDaTrilha {
  if (!(r.tirados.some((t) => t.id === id) && cabeMaisUm(r))) {
    return r;
  }
  const ordem = ordemComTirados(r);
  const antes = ordem
    .slice(0, ordem.indexOf(id))
    .filter((c) => r.cursos.includes(c)).length;
  return {
    ...r,
    cursos: r.cursos.toSpliced(antes, 0, id),
    tirados: semTirado(r, id),
  };
}

export const mesmoRascunho = (a: RascunhoDaTrilha, b: RascunhoDaTrilha) =>
  a.titulo === b.titulo &&
  a.slug === b.slug &&
  a.descricao === b.descricao &&
  a.cursos.length === b.cursos.length &&
  a.cursos.every((c, i) => c === b.cursos[i]);

export const cabeMaisUm = (r: RascunhoDaTrilha) =>
  r.cursos.length < LIMITES_DA_TRILHA.cursos;

export function mudarTrilha(
  r: RascunhoDaTrilha,
  m: MudancaDaTrilha
): RascunhoDaTrilha {
  switch (m.tipo) {
    case "campos":
      return { ...r, ...m.mudanca };
    case "curso_acrescentado":
      return r.cursos.includes(m.id) || !cabeMaisUm(r)
        ? r
        : {
            ...r,
            cursos: [...r.cursos, m.id],
            tirados: semTirado(r, m.id),
          };
    case "curso_movido": {
      const cursos = trocado(r.cursos, r.cursos.indexOf(m.id), m.direcao);
      return cursos ? { ...r, cursos } : r;
    }
    case "curso_tirado": {
      const i = r.cursos.indexOf(m.id);
      return i < 0
        ? r
        : {
            ...r,
            cursos: r.cursos.toSpliced(i, 1),
            tirados: [
              ...semTirado(r, m.id),
              { antesDe: r.cursos[i + 1] ?? null, id: m.id },
            ],
          };
    }
    case "curso_devolvido":
      return devolvido(r, m.id);
    default: {
      const nenhuma: never = m;
      throw new Error(`Mudança sem regra: ${JSON.stringify(nenhuma)}`);
    }
  }
}

export const REGRAS_DA_TRILHA: RegrasDoRascunho<
  DocumentoDaTrilha,
  RascunhoDaTrilha,
  MudancaDaTrilha
> = { deDocumento: rascunhoDaTrilha, mesmo: mesmoRascunho, mudar: mudarTrilha };

/** Ids estáveis: o erro, o foco e o teste acham o elemento sem useId. */
export const ID_DA_TRILHA = {
  acrescentar: "trilha-acrescentar",
  campo: (c: CampoDaTrilha) => `trilha-${c}`,
  curso: (id: CursoId, botao: Direcao | "desfazer" | "tirar") =>
    `trilha-curso-${id}-${botao}`,
  /** O h2 da seção (o Secao põe tabIndex={-1}): os problemas da lista marcam e focam aqui. */
  cursos: "trilha-cursos",
} as const;

/**
 * O id que recebe o foco depois da mudança, calculado com o rascunho de antes.
 * Mover leva à mesma seta, ou à outra quando o curso chega à borda. Tirar um
 * curso da lista salva leva ao Desfazer da linha riscada; tirar o que entrou
 * neste rascunho leva ao Tirar do curso seguinte, senão ao do anterior, senão à
 * busca. Desfazer leva ao Tirar do curso devolvido.
 */
export function focoDepois(
  r: RascunhoDaTrilha,
  m: MudancaDaTrilha,
  salvo: readonly CursoId[]
): string | null {
  switch (m.tipo) {
    case "curso_movido": {
      const i = r.cursos.indexOf(m.id);
      if (trocado(r.cursos, i, m.direcao) === null) {
        return null;
      }
      const borda =
        m.direcao === "acima" ? i - 1 === 0 : i + 1 === r.cursos.length - 1;
      return ID_DA_TRILHA.curso(m.id, setaDepoisDeMover(m.direcao, borda));
    }
    case "curso_tirado": {
      const i = r.cursos.indexOf(m.id);
      if (i < 0) {
        return null;
      }
      if (salvo.includes(m.id)) {
        return ID_DA_TRILHA.curso(m.id, "desfazer");
      }
      const vizinho = r.cursos[i + 1] ?? r.cursos[i - 1];
      return vizinho
        ? ID_DA_TRILHA.curso(vizinho, "tirar")
        : ID_DA_TRILHA.acrescentar;
    }
    case "curso_acrescentado":
      return ID_DA_TRILHA.acrescentar;
    case "curso_devolvido":
      return r.tirados.some((t) => t.id === m.id) && cabeMaisUm(r)
        ? ID_DA_TRILHA.curso(m.id, "tirar")
        : null;
    default:
      return null;
  }
}

/** Cursos do catálogo que podem entrar: fora da lista, soltos ou desta trilha, na ordem do catálogo. */
export const candidatos = (
  catalogo: readonly CursoNaVisao[],
  r: RascunhoDaTrilha,
  trilhaId: TrilhaId
): CursoNaVisao[] =>
  catalogo.filter(
    (c) =>
      !r.cursos.includes(c.id) &&
      (c.trilha === null || c.trilha.id === trilhaId)
  );

export interface Perda {
  cursoId: CursoId;
  /**
   * Quem começou o curso só pela trilha, contado na abertura da página. null:
   * o uso que a página trouxe não conta este curso (a base é de outro salvar).
   */
  pessoas: number | null;
  titulo: string;
}

/**
 * Os cursos que saem neste salvamento, na ordem da lista salva. Reordenar e
 * acrescentar não são perda. Quem só tinha a trilha perde o curso na hora.
 */
export function perdas({
  catalogo,
  rascunho,
  salvo,
  uso,
}: {
  catalogo: readonly CursoNaVisao[];
  rascunho: RascunhoDaTrilha;
  salvo: readonly CursoId[];
  uso: Pick<UsoDaTrilha, "comecaramSoPelaTrilha">;
}): Perda[] {
  return salvo
    .filter((id) => !rascunho.cursos.includes(id))
    .map((cursoId) => ({
      cursoId,
      pessoas:
        uso.comecaramSoPelaTrilha.find((p) => p.cursoId === cursoId)?.pessoas ??
        null,
      titulo:
        catalogo.find((c) => c.id === cursoId)?.titulo ??
        "Curso apagado do catálogo",
    }));
}

export type MotivoDaBusca = Parameters<
  NonNullable<ComponentProps<typeof Combobox>["onInputValueChange"]>
>[1]["reason"];

/**
 * O texto que o campo de busca do combobox guarda. Depois do onValueChange, o
 * Base UI escreve no campo o rótulo do curso escolhido, com o motivo
 * "item-press"; a busca volta vazia para o próximo curso. O motivo vem do
 * union do Base UI: se ele renomear "item-press", isto deixa de compilar.
 */
export const textoDaBusca = (texto: string, motivo: MotivoDaBusca) =>
  motivo === "item-press" ? "" : texto;

/**
 * O Enter na busca que o editor segura. O Base UI 1.8 só trata o Enter com a
 * lista aberta e um curso destacado; nos outros casos ele deixa o Enter seguir
 * ("Allow form submission when no item is highlighted"), e o browser enviaria
 * o formulário da trilha, que salva na hora.
 */
export const enterSeguraOFormulario = ({
  aberto,
  destacado,
  key,
}: {
  aberto: boolean;
  destacado: number | null;
  key: string;
}) => key === "Enter" && !(aberto && destacado !== null);

export type RascunhoLido =
  | { tipo: "lido"; documento: DocumentoDaTrilha }
  | { tipo: "problemas"; problemas: Problemas };

const CAMPOS = new Set<PropertyKey>([
  "descricao",
  "slug",
  "titulo",
] satisfies CampoDaTrilha[]);

/** A posição é a que a lista mostra no número redondo de cada linha. */
function mensagemDosCursos(i: z.core.$ZodIssue, r: RascunhoDaTrilha) {
  const [, posicao] = i.path;
  if (typeof posicao !== "number") {
    return i.code === "too_big"
      ? `Uma trilha tem no máximo ${Number(i.maximum)} cursos. Tire ${r.cursos.length - Number(i.maximum)} para salvar.`
      : fraseDeReserva("A trilha", i.path);
  }
  if (i.code === "custom") {
    const id = r.cursos[posicao]?.toLowerCase();
    const primeira = r.cursos.findIndex((c) => c.toLowerCase() === id);
    return `O ${posicao + 1}º curso da lista repete o ${primeira + 1}º. Tire um deles.`;
  }
  return `O ${posicao + 1}º curso da lista tem um identificador que o servidor recusa. Tire-o da trilha e salve de novo.`;
}

/** Total: toda recusa do schema vira um problema com frase. */
function problemaDaIssue(i: z.core.$ZodIssue, r: RascunhoDaTrilha): Problema {
  const [raiz] = i.path;
  if (i.path.length === 1 && raiz !== undefined && CAMPOS.has(raiz)) {
    return {
      campo: ID_DA_TRILHA.campo(raiz as CampoDaTrilha),
      mensagem: mensagemDoTexto(i) ?? "Confira este campo.",
    };
  }
  if (raiz === "cursos") {
    return { campo: ID_DA_TRILHA.cursos, mensagem: mensagemDosCursos(i, r) };
  }
  return { campo: null, mensagem: fraseDeReserva("A trilha", i.path) };
}

export function lerRascunhoDaTrilha(
  r: RascunhoDaTrilha,
  salvo: Pick<DocumentoDaTrilha, "id" | "versao">
): RascunhoLido {
  const lido = documentoDaTrilha.safeParse({
    ...r,
    id: salvo.id,
    versao: salvo.versao,
  });
  if (lido.success) {
    return { documento: lido.data, tipo: "lido" };
  }
  const [primeiro, ...outros] = lido.error.issues.map((i) =>
    problemaDaIssue(i, r)
  );
  return {
    problemas: semRepetir([
      primeiro ?? { campo: null, mensagem: fraseDeReserva("A trilha", []) },
      ...outros,
    ]),
    tipo: "problemas",
  };
}

export type RecusaDaTrilha = Recusa<"slug">;

export const recusaDaTrilha = (
  motivo: Motivo | null,
  r: RascunhoDaTrilha
): RecusaDaTrilha | null =>
  motivo === "slug_repetido"
    ? {
        campo: "slug",
        mensagem: "Outra trilha já usa este endereço.",
        valor: r.slug,
      }
    : null;

/**
 * O que a tela marca: a leitura depois de um salvar recusado na tela, e o
 * endereço que o servidor recusou enquanto o admin não o muda.
 */
export function problemasNaTela({
  lido,
  rascunho,
  recusa,
  tentou,
}: {
  lido: RascunhoLido;
  rascunho: RascunhoDaTrilha;
  recusa: RecusaDaTrilha | null;
  tentou: boolean;
}): Problema[] {
  return [
    ...(tentou && lido.tipo === "problemas" ? lido.problemas : []),
    ...recusaNaTela(recusa, rascunho, ID_DA_TRILHA.campo),
  ];
}
