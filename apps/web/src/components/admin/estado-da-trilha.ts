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

/** O tirado fica no lugar até o Desfazer; só os não tirados vão ao servidor. */
export interface CursoNaLista {
  id: CursoId;
  tirado: boolean;
}

/** Id e versão não mudam no editor e ficam no Apoio. */
export type RascunhoDaTrilha = Pick<
  DocumentoDaTrilha,
  "descricao" | "slug" | "titulo"
> & {
  lista: readonly CursoNaLista[];
};
export type CampoDaTrilha = "descricao" | "slug" | "titulo";

export type MudancaDaTrilha =
  | {
      tipo: "campos";
      mudanca: Partial<Pick<RascunhoDaTrilha, CampoDaTrilha>>;
    }
  /** `salvo`: o curso está na lista salva, conferido no despacho contra a base. */
  | { tipo: "curso_acrescentado"; id: CursoId; salvo: boolean }
  | { tipo: "curso_movido"; id: CursoId; direcao: Direcao }
  | { tipo: "curso_tirado"; id: CursoId }
  | { tipo: "curso_devolvido"; id: CursoId };

export const rascunhoDaTrilha = (d: DocumentoDaTrilha): RascunhoDaTrilha => ({
  descricao: d.descricao,
  lista: d.cursos.map((id) => ({ id, tirado: false })),
  slug: d.slug,
  titulo: d.titulo,
});

export const cursosDoRascunho = (r: RascunhoDaTrilha): CursoId[] =>
  r.lista.flatMap((c) => (c.tirado ? [] : [c.id]));

export type LinhaDaLista =
  | { tipo: "curso"; id: CursoId; posicao: number }
  | { tipo: "tirado"; id: CursoId };

/** O que entrou e saiu neste rascunho some, porque não é perda. */
export function linhasDaLista(
  r: RascunhoDaTrilha,
  salvo: readonly CursoId[]
): LinhaDaLista[] {
  let posicao = 0;
  return r.lista.flatMap(({ id, tirado }): LinhaDaLista[] => {
    if (!tirado) {
      posicao += 1;
      return [{ id, posicao, tipo: "curso" }];
    }
    return salvo.includes(id) ? [{ id, tipo: "tirado" }] : [];
  });
}

export const mesmoRascunho = (a: RascunhoDaTrilha, b: RascunhoDaTrilha) => {
  const [ca, cb] = [cursosDoRascunho(a), cursosDoRascunho(b)];
  return (
    a.titulo === b.titulo &&
    a.slug === b.slug &&
    a.descricao === b.descricao &&
    ca.length === cb.length &&
    ca.every((c, i) => c === cb[i])
  );
};

export const cabeMaisUm = (r: RascunhoDaTrilha) =>
  cursosDoRascunho(r).length < LIMITES_DA_TRILHA.cursos;

const marcado = (r: RascunhoDaTrilha, id: CursoId, tirado: boolean) => {
  const i = r.lista.findIndex((c) => c.id === id && c.tirado !== tirado);
  return i < 0 ? r : { ...r, lista: r.lista.with(i, { id, tirado }) };
};

function movida(
  lista: readonly CursoNaLista[],
  id: CursoId,
  direcao: Direcao
): CursoNaLista[] | null {
  const i = lista.findIndex((c) => c.id === id && !c.tirado);
  if (i < 0) {
    return null;
  }
  const j =
    direcao === "acima"
      ? lista.findLastIndex((c, k) => k < i && !c.tirado)
      : lista.findIndex((c, k) => k > i && !c.tirado);
  if (j < 0) {
    return null;
  }
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j] as CursoNaLista, nova[i] as CursoNaLista];
  return nova;
}

export function mudarTrilha(
  r: RascunhoDaTrilha,
  m: MudancaDaTrilha
): RascunhoDaTrilha {
  switch (m.tipo) {
    case "campos":
      return { ...r, ...m.mudanca };
    case "curso_acrescentado":
      if (cursosDoRascunho(r).includes(m.id) || !cabeMaisUm(r)) {
        return r;
      }
      // O salvo volta ao lugar dele, como o Desfazer; o que nunca foi salvo
      // não tem lugar e vai ao fim, como diz o "Acrescentar curso no fim".
      return m.salvo && r.lista.some((c) => c.id === m.id)
        ? marcado(r, m.id, false)
        : {
            ...r,
            lista: [
              ...r.lista.filter((c) => c.id !== m.id),
              { id: m.id, tirado: false },
            ],
          };
    case "curso_movido": {
      const lista = movida(r.lista, m.id, m.direcao);
      return lista ? { ...r, lista } : r;
    }
    case "curso_tirado":
      return marcado(r, m.id, true);
    case "curso_devolvido":
      return cabeMaisUm(r) ? marcado(r, m.id, false) : r;
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
  /** O Secao põe tabIndex={-1} no h2: é ele que recebe o foco. */
  cursos: "trilha-cursos",
} as const;

/** Calculado com o rascunho de antes da mudança. */
export function focoDepois(
  r: RascunhoDaTrilha,
  m: MudancaDaTrilha,
  salvo: readonly CursoId[]
): string | null {
  const cursos = cursosDoRascunho(r);
  switch (m.tipo) {
    case "curso_movido": {
      const i = cursos.indexOf(m.id);
      if (trocado(cursos, i, m.direcao) === null) {
        return null;
      }
      const borda =
        m.direcao === "acima" ? i - 1 === 0 : i + 1 === cursos.length - 1;
      return ID_DA_TRILHA.curso(m.id, setaDepoisDeMover(m.direcao, borda));
    }
    case "curso_tirado": {
      const i = cursos.indexOf(m.id);
      if (i < 0) {
        return null;
      }
      if (salvo.includes(m.id)) {
        return ID_DA_TRILHA.curso(m.id, "desfazer");
      }
      const vizinho = cursos[i + 1] ?? cursos[i - 1];
      return vizinho
        ? ID_DA_TRILHA.curso(vizinho, "tirar")
        : ID_DA_TRILHA.acrescentar;
    }
    case "curso_acrescentado":
      return ID_DA_TRILHA.acrescentar;
    case "curso_devolvido":
      return r.lista.some((c) => c.id === m.id && c.tirado) && cabeMaisUm(r)
        ? ID_DA_TRILHA.curso(m.id, "tirar")
        : null;
    default:
      return null;
  }
}

export const candidatos = (
  catalogo: readonly CursoNaVisao[],
  r: RascunhoDaTrilha,
  trilhaId: TrilhaId
): CursoNaVisao[] =>
  catalogo.filter(
    (c) =>
      !cursosDoRascunho(r).includes(c.id) &&
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
  const cursos = cursosDoRascunho(rascunho);
  return salvo
    .filter((id) => !cursos.includes(id))
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

function mensagemDosCursos(i: z.core.$ZodIssue, cursos: readonly CursoId[]) {
  const [, posicao] = i.path;
  if (typeof posicao !== "number") {
    return i.code === "too_big"
      ? `Uma trilha tem no máximo ${Number(i.maximum)} cursos. Tire ${cursos.length - Number(i.maximum)} para salvar.`
      : fraseDeReserva("A trilha", i.path);
  }
  if (i.code === "custom") {
    const id = cursos[posicao]?.toLowerCase();
    const primeira = cursos.findIndex((c) => c.toLowerCase() === id);
    return `O ${posicao + 1}º curso da lista repete o ${primeira + 1}º. Tire um deles.`;
  }
  return `O ${posicao + 1}º curso da lista tem um identificador que o servidor recusa. Tire-o da trilha e salve de novo.`;
}

function problemaDaIssue(
  i: z.core.$ZodIssue,
  cursos: readonly CursoId[]
): Problema {
  const [raiz] = i.path;
  if (i.path.length === 1 && raiz !== undefined && CAMPOS.has(raiz)) {
    return {
      campo: ID_DA_TRILHA.campo(raiz as CampoDaTrilha),
      mensagem: mensagemDoTexto(i) ?? "Confira este campo.",
    };
  }
  if (raiz === "cursos") {
    return {
      campo: ID_DA_TRILHA.cursos,
      mensagem: mensagemDosCursos(i, cursos),
    };
  }
  return { campo: null, mensagem: fraseDeReserva("A trilha", i.path) };
}

export function lerRascunhoDaTrilha(
  r: RascunhoDaTrilha,
  salvo: Pick<DocumentoDaTrilha, "id" | "versao">
): RascunhoLido {
  const cursos = cursosDoRascunho(r);
  const lido = documentoDaTrilha.safeParse({
    cursos,
    descricao: r.descricao,
    id: salvo.id,
    slug: r.slug,
    titulo: r.titulo,
    versao: salvo.versao,
  });
  if (lido.success) {
    return { documento: lido.data, tipo: "lido" };
  }
  const [primeiro, ...outros] = lido.error.issues.map((i) =>
    problemaDaIssue(i, cursos)
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
