import type { DocumentoDoCurso } from "@cursos/api/dominio/edicao-do-curso";
import type { AulaId, ModuloId } from "@cursos/api/dominio/tipos";

import { type Direcao, trocado } from "@/lib/editor";
import type { RegrasDoRascunho } from "@/lib/use-rascunho-apoiado";

import {
  type AulaDoRascunho,
  lerNumeroDoModulo,
  type ModuloDoRascunho,
  mesmoRascunho,
  type RascunhoDoCurso,
  rascunhoDoCurso,
} from "./rascunho-do-curso";

type CampoDoCurso = Exclude<
  keyof RascunhoDoCurso,
  "id" | "modulos" | "niveis" | "versao"
>;

export type Mudanca =
  | { tipo: "campos"; mudanca: Partial<Pick<RascunhoDoCurso, CampoDoCurso>> }
  | { tipo: "nivel_novo"; ordem: number }
  | { tipo: "nivel_renomeado"; ordem: number; nome: string }
  | { tipo: "nivel_removido"; ordem: number }
  | { tipo: "modulo_novo"; id: ModuloId }
  | {
      tipo: "modulo_editado";
      id: ModuloId;
      mudanca: Partial<
        Pick<ModuloDoRascunho, "nivelOrdem" | "numero" | "titulo">
      >;
    }
  | { tipo: "modulos_ordenados" }
  | { tipo: "modulo_movido"; id: ModuloId; direcao: Direcao }
  | { tipo: "modulo_removido"; id: ModuloId }
  | { tipo: "aula_nova"; moduloId: ModuloId; id: AulaId }
  | {
      tipo: "aula_editada";
      id: AulaId;
      mudanca: Partial<Omit<AulaDoRascunho, "id">>;
    }
  | { tipo: "aula_movida"; id: AulaId; direcao: Direcao }
  | { tipo: "aula_para_modulo"; id: AulaId; moduloId: ModuloId }
  | { tipo: "aula_removida"; id: AulaId };

export const proximaOrdem = (niveis: RascunhoDoCurso["niveis"]) =>
  Math.max(0, ...niveis.map((n) => n.ordem)) + 1;

const numeroDe = (m: ModuloDoRascunho) => {
  const lido = lerNumeroDoModulo(m.numero);
  return "valor" in lido ? lido.valor : null;
};

const porNumero = (modulos: ModuloDoRascunho[]) =>
  modulos.toSorted(
    (a, b) =>
      (numeroDe(a) ?? Number.POSITIVE_INFINITY) -
      (numeroDe(b) ?? Number.POSITIVE_INFINITY)
  );

const comAulas = (
  r: RascunhoDoCurso,
  moduloId: ModuloId,
  trocar: (aulas: AulaDoRascunho[]) => AulaDoRascunho[] | null
): RascunhoDoCurso => {
  let mudou = false;
  const modulos = r.modulos.map((m) => {
    if (m.id !== moduloId) {
      return m;
    }
    const aulas = trocar(m.aulas);
    if (aulas === null) {
      return m;
    }
    mudou = true;
    return { ...m, aulas };
  });
  return mudou ? { ...r, modulos } : r;
};

const moduloDaAula = (r: RascunhoDoCurso, id: AulaId) =>
  r.modulos.find((m) => m.aulas.some((a) => a.id === id));

export function mudar(r: RascunhoDoCurso, m: Mudanca): RascunhoDoCurso {
  switch (m.tipo) {
    case "campos":
      return { ...r, ...m.mudanca };
    case "nivel_novo":
      return { ...r, niveis: [...r.niveis, { nome: "", ordem: m.ordem }] };
    case "nivel_renomeado":
      return {
        ...r,
        niveis: r.niveis.map((n) =>
          n.ordem === m.ordem ? { ...n, nome: m.nome } : n
        ),
      };
    case "nivel_removido":
      return {
        ...r,
        modulos: r.modulos.map((x) =>
          x.nivelOrdem === m.ordem ? { ...x, nivelOrdem: null } : x
        ),
        niveis: r.niveis.filter((n) => n.ordem !== m.ordem),
      };
    case "modulo_novo": {
      const numero = Math.max(0, ...r.modulos.map((x) => numeroDe(x) ?? 0));
      return {
        ...r,
        modulos: [
          ...r.modulos,
          {
            aulas: [],
            id: m.id,
            nivelOrdem: null,
            numero: String(numero + 1),
            titulo: "",
          },
        ],
      };
    }
    case "modulo_editado":
      return {
        ...r,
        modulos: r.modulos.map((x) =>
          x.id === m.id ? { ...x, ...m.mudanca } : x
        ),
      };
    case "modulos_ordenados":
      return { ...r, modulos: porNumero(r.modulos) };
    case "modulo_movido": {
      const i = r.modulos.findIndex((x) => x.id === m.id);
      const modulos = trocado(r.modulos, i, m.direcao);
      if (modulos === null) {
        return r;
      }
      const j = m.direcao === "acima" ? i - 1 : i + 1;
      const a = modulos[i] as ModuloDoRascunho;
      const b = modulos[j] as ModuloDoRascunho;
      modulos[i] = { ...a, numero: b.numero };
      modulos[j] = { ...b, numero: a.numero };
      return { ...r, modulos };
    }
    case "modulo_removido":
      return { ...r, modulos: r.modulos.filter((x) => x.id !== m.id) };
    case "aula_nova":
      return comAulas(r, m.moduloId, (aulas) => [
        ...aulas,
        { duracao: "", id: m.id, titulo: "", video: "" },
      ]);
    case "aula_editada": {
      const de = moduloDaAula(r, m.id);
      return de
        ? comAulas(r, de.id, (aulas) =>
            aulas.map((a) => (a.id === m.id ? { ...a, ...m.mudanca } : a))
          )
        : r;
    }
    case "aula_movida": {
      const de = moduloDaAula(r, m.id);
      return de
        ? comAulas(r, de.id, (aulas) =>
            trocado(
              aulas,
              aulas.findIndex((a) => a.id === m.id),
              m.direcao
            )
          )
        : r;
    }
    case "aula_para_modulo": {
      const de = moduloDaAula(r, m.id);
      const aula = de?.aulas.find((a) => a.id === m.id);
      if (
        !(de && aula) ||
        de.id === m.moduloId ||
        !r.modulos.some((x) => x.id === m.moduloId)
      ) {
        return r;
      }
      const sem = comAulas(r, de.id, (aulas) =>
        aulas.filter((a) => a.id !== m.id)
      );
      return comAulas(sem, m.moduloId, (aulas) => [...aulas, aula]);
    }
    case "aula_removida": {
      const de = moduloDaAula(r, m.id);
      return de
        ? comAulas(r, de.id, (aulas) => aulas.filter((a) => a.id !== m.id))
        : r;
    }
    default: {
      const nenhuma: never = m;
      throw new Error(`Mudança sem regra: ${JSON.stringify(nenhuma)}`);
    }
  }
}

export const REGRAS_DO_CURSO: RegrasDoRascunho<
  DocumentoDoCurso,
  RascunhoDoCurso,
  Mudanca
> = { deDocumento: rascunhoDoCurso, mesmo: mesmoRascunho, mudar };
