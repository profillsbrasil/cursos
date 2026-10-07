import { PCT_AULA_ASSISTIDA } from "./regras";

/** [inicio, fim) em segundos inteiros do vídeo, com fim > inicio. */
export interface Trecho {
  readonly fim: number;
  readonly inicio: number;
}

declare const canonico: unique symbol;

/**
 * Trechos inteiros, ordenados, sem sobreposição, sem trechos encostados e dentro
 * de [0, duração). `canonizar` e `SEM_TRECHOS` produzem o tipo; `subtrair`,
 * `primeiros` e `unir` o preservam a partir de entradas canônicas.
 */
export type Trechos = readonly Trecho[] & { readonly [canonico]: true };

export const SEM_TRECHOS = [] as unknown as Trechos;

export interface Cobertura {
  pct: number;
  vistosSeg: number;
}

export function canonizar(
  lista: readonly Trecho[],
  duracaoSeg: number
): Trechos {
  const cortados = lista
    .map((t) => ({
      fim: Math.min(Math.floor(t.fim), duracaoSeg),
      inicio: Math.max(Math.floor(t.inicio), 0),
    }))
    .filter((t) => t.fim > t.inicio)
    .sort((a, b) => a.inicio - b.inicio);
  const saida: Trecho[] = [];
  for (const t of cortados) {
    const ultimo = saida.at(-1);
    if (ultimo && t.inicio <= ultimo.fim) {
      saida[saida.length - 1] = {
        fim: Math.max(ultimo.fim, t.fim),
        inicio: ultimo.inicio,
      };
    } else {
      saida.push(t);
    }
  }
  return saida as readonly Trecho[] as Trechos;
}

const fimDe = (t: Trechos) => t.at(-1)?.fim ?? 0;

/** Idempotente e comutativa: a ordem dos envios não importa. */
export const unir = (a: Trechos, b: Trechos): Trechos =>
  canonizar([...a, ...b], Math.max(fimDe(a), fimDe(b)));

/** O que está em `a` e não em `b`: os segundos novos de um envio. */
export function subtrair(a: Trechos, b: Trechos): Trechos {
  const saida: Trecho[] = [];
  for (const t of a) {
    let { inicio } = t;
    for (const r of b) {
      if (r.fim <= inicio) {
        continue;
      }
      if (r.inicio >= t.fim) {
        break;
      }
      if (r.inicio > inicio) {
        saida.push({ fim: r.inicio, inicio });
      }
      inicio = Math.max(inicio, r.fim);
    }
    if (inicio < t.fim) {
      saida.push({ fim: t.fim, inicio });
    }
  }
  return saida as readonly Trecho[] as Trechos;
}

export const segundos = (t: readonly Trecho[]): number =>
  t.reduce((s, x) => s + (x.fim - x.inicio), 0);

/** Os primeiros `seg` segundos de `t`, na ordem dos trechos. */
export function primeiros(t: Trechos, seg: number): Trechos {
  const saida: Trecho[] = [];
  let resta = Math.max(0, Math.floor(seg));
  for (const x of t) {
    if (resta === 0) {
      break;
    }
    const leva = Math.min(resta, x.fim - x.inicio);
    saida.push({ fim: x.inicio + leva, inicio: x.inicio });
    resta -= leva;
  }
  return saida as readonly Trecho[] as Trechos;
}

export const atingiuMeta = (vistosSeg: number, duracaoSeg: number): boolean =>
  vistosSeg * 100 >= duracaoSeg * PCT_AULA_ASSISTIDA;

export function cobertura(t: Trechos, duracaoSeg: number): Cobertura {
  const vistosSeg = segundos(t);
  return {
    pct: duracaoSeg === 0 ? 0 : Math.floor((vistosSeg * 100) / duracaoSeg),
    vistosSeg,
  };
}

/**
 * Tempo do vídeo (fracionário) para trecho inteiro: [floor(inicio), floor(fim)).
 * Cortes sucessivos no mesmo ponto c dão [a, floor(c)) e [floor(c), b), então
 * reprodução contínua não deixa buraco entre envios.
 */
export function quantizar(inicioSeg: number, fimSeg: number): Trecho | null {
  const inicio = Math.floor(inicioSeg);
  const fim = Math.floor(fimSeg);
  return fim > inicio ? { fim, inicio } : null;
}
