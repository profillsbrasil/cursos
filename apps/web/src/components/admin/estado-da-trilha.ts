// O rascunho da trilha e as regras da lista de cursos, sem React: a tela só
// despacha a mudança e desenha.

import type { CursoNaVisao } from "@cursos/api/dominio/catalogo";
import {
  type DocumentoDaTrilha,
  LIMITES_DA_TRILHA,
} from "@cursos/api/dominio/edicao-da-trilha";
import type { CursoId, TrilhaId } from "@cursos/api/dominio/tipos";

import { type Direcao, setaDepoisDeMover, trocado } from "@/lib/editor";

/** O que o admin edita. Id e versão não mudam no editor e ficam no Apoio. */
export type RascunhoDaTrilha = Pick<
  DocumentoDaTrilha,
  "cursos" | "descricao" | "slug" | "titulo"
>;
export type CampoDaTrilha = "descricao" | "slug" | "titulo";

export type MudancaDaTrilha =
  | {
      tipo: "campos";
      mudanca: Partial<Pick<RascunhoDaTrilha, CampoDaTrilha>>;
    }
  | { tipo: "curso_acrescentado"; id: CursoId }
  | { tipo: "curso_movido"; id: CursoId; direcao: Direcao }
  | { tipo: "curso_tirado"; id: CursoId }
  /**
   * O servidor gravou `enviado` como `documento`. O que o admin editou com o
   * salvar pendente fica.
   */
  | { tipo: "salvo"; documento: DocumentoDaTrilha; enviado: RascunhoDaTrilha }
  | { tipo: "recomecado"; documento: DocumentoDaTrilha };

export const rascunhoDaTrilha = (d: DocumentoDaTrilha): RascunhoDaTrilha => ({
  cursos: d.cursos,
  descricao: d.descricao,
  slug: d.slug,
  titulo: d.titulo,
});

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
        : { ...r, cursos: [...r.cursos, m.id] };
    case "curso_movido": {
      const cursos = trocado(r.cursos, r.cursos.indexOf(m.id), m.direcao);
      return cursos ? { ...r, cursos } : r;
    }
    case "curso_tirado":
      return r.cursos.includes(m.id)
        ? { ...r, cursos: r.cursos.filter((c) => c !== m.id) }
        : r;
    case "salvo":
      return mesmoRascunho(r, m.enviado) ? rascunhoDaTrilha(m.documento) : r;
    case "recomecado":
      return rascunhoDaTrilha(m.documento);
    default: {
      const nenhuma: never = m;
      throw new Error(`Mudança sem regra: ${JSON.stringify(nenhuma)}`);
    }
  }
}

/** Ids estáveis: o erro, o foco e o teste acham o elemento sem useId. */
export const ID_DA_TRILHA = {
  acrescentar: "trilha-acrescentar",
  campo: (c: CampoDaTrilha) => `trilha-${c}`,
  curso: (id: CursoId, botao: Direcao | "tirar") =>
    `trilha-curso-${id}-${botao}`,
  /** O h2 da seção (o Secao põe tabIndex={-1}): os problemas da lista marcam e focam aqui. */
  cursos: "trilha-cursos",
} as const;

/**
 * O id que recebe o foco depois da mudança, calculado com o rascunho de antes.
 * Mover leva à mesma seta, ou à outra quando o curso chega à borda; tirar leva
 * ao Tirar do curso seguinte, senão ao do anterior, senão à busca.
 */
export function focoDepois(
  r: RascunhoDaTrilha,
  m: MudancaDaTrilha
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
      const vizinho = r.cursos[i + 1] ?? r.cursos[i - 1];
      return vizinho
        ? ID_DA_TRILHA.curso(vizinho, "tirar")
        : ID_DA_TRILHA.acrescentar;
    }
    case "curso_acrescentado":
      return ID_DA_TRILHA.acrescentar;
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
