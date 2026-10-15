import type { DocumentoDoCurso } from "@cursos/api/dominio/edicao-do-curso";
import type { AulaId, ModuloId } from "@cursos/api/dominio/tipos";

import { type Direcao, trocado } from "@/lib/editor";
import type { RegrasDoRascunho } from "@/lib/use-rascunho-apoiado";

import type { Problema } from "./problemas";
import {
  type AulaDoRascunho,
  ID,
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

/**
 * Os módulos que o admin deixou abertos no editor; fechado é o padrão. Fica
 * fora do rascunho, então não entra no sujo nem no documento salvo.
 */
export type Abertos = ReadonlySet<ModuloId>;

export const NENHUM_ABERTO: Abertos = new Set();

export type AcaoNosBlocos =
  | { tipo: "aberto"; id: ModuloId }
  | { tipo: "fechado"; id: ModuloId }
  /** O Salvar recusado pelo schema abre os módulos com campo marcado. */
  | { tipo: "erros_mostrados"; ids: readonly ModuloId[] }
  | { tipo: "mudou"; mudanca: Mudanca };

/** Os campos com erro na tela, pelo id do input. */
export type Marcados = Pick<ReadonlySet<string>, "has">;

/** Como o bloco aparece. O erro nunca fica num bloco fechado. */
export type Bloco =
  | { tipo: "fechado" }
  | { tipo: "aberto" }
  | { tipo: "com_erro"; campos: number };

const comAberto = (abertos: Abertos, id: ModuloId): Abertos =>
  abertos.has(id) ? abertos : new Set([...abertos, id]);

const semAberto = (abertos: Abertos, id: ModuloId): Abertos =>
  abertos.has(id) ? new Set([...abertos].filter((x) => x !== id)) : abertos;

/** O foco vai para dentro do módulo novo e do destino da aula movida. */
function abertosDepoisDe(abertos: Abertos, m: Mudanca): Abertos {
  switch (m.tipo) {
    case "modulo_novo":
      return comAberto(abertos, m.id);
    case "aula_para_modulo":
      return comAberto(abertos, m.moduloId);
    case "modulo_removido":
      return semAberto(abertos, m.id);
    default:
      return abertos;
  }
}

export function blocosAbertos(abertos: Abertos, a: AcaoNosBlocos): Abertos {
  switch (a.tipo) {
    case "aberto":
      return comAberto(abertos, a.id);
    case "fechado":
      return semAberto(abertos, a.id);
    case "erros_mostrados":
      return a.ids.reduce(comAberto, abertos);
    case "mudou":
      return abertosDepoisDe(abertos, a.mudanca);
    default: {
      const nenhuma: never = a;
      throw new Error(`Ação sem regra: ${JSON.stringify(nenhuma)}`);
    }
  }
}

const CAMPOS_DO_MODULO = ["nivel", "numero", "titulo"] as const;
const CAMPOS_DA_AULA = ["duracao", "titulo", "video"] as const;

const camposComErro = (m: ModuloDoRascunho, marcados: Marcados) =>
  [
    ...CAMPOS_DO_MODULO.map((c) => ID.modulo(m.id, c)),
    ...m.aulas.flatMap((a) => CAMPOS_DA_AULA.map((c) => ID.aula(a.id, c))),
  ].filter((id) => marcados.has(id)).length;

export const modulosComErro = (
  r: RascunhoDoCurso,
  marcados: Marcados
): ModuloId[] =>
  r.modulos.flatMap((m) => (camposComErro(m, marcados) > 0 ? [m.id] : []));

export function blocoDoModulo(
  m: ModuloDoRascunho,
  abertos: Abertos,
  marcados: Marcados
): Bloco {
  const campos = camposComErro(m, marcados);
  if (campos > 0) {
    return { campos, tipo: "com_erro" };
  }
  return abertos.has(m.id) ? { tipo: "aberto" } : { tipo: "fechado" };
}

/**
 * Os módulos com erro na tela que ainda não estão entre os abertos. O editor
 * despacha a ação no render em que o erro aparece, e o bloco continua aberto
 * depois da correção. null: nada a abrir.
 */
export function abrirOsComErro(
  abertos: Abertos,
  r: RascunhoDoCurso,
  marcados: Marcados
): AcaoNosBlocos | null {
  const ids = modulosComErro(r, marcados).filter((id) => !abertos.has(id));
  return ids.length > 0 ? { ids, tipo: "erros_mostrados" } : null;
}

/** Toda mudança do rascunho passa também pelos blocos: o módulo novo e o destino da aula movida abrem. */
export const despacharNosDois =
  (
    mudarRascunho: (m: Mudanca) => void,
    mudarBlocos: (a: AcaoNosBlocos) => void
  ) =>
  (mudanca: Mudanca) => {
    mudarRascunho(mudanca);
    mudarBlocos({ mudanca, tipo: "mudou" });
  };

/**
 * O que a tela marca. Antes do Salvar, só o erro dos campos que o admin já
 * deixou (`tocados`), como o "abc" na duração; depois do Salvar recusado,
 * tudo o que o Salvar recusaria (`achados`). A recusa do servidor aparece
 * sempre, enquanto o valor recusado continua no campo.
 */
export function problemasNaTela({
  achados,
  recusa,
  tentou,
  tocados,
}: {
  achados: readonly Problema[];
  recusa: readonly Problema[];
  tentou: boolean;
  tocados: ReadonlySet<string>;
}): Problema[] {
  const vistos = tentou
    ? achados
    : achados.filter((p) => p.campo !== null && tocados.has(p.campo));
  return [...vistos, ...recusa];
}
