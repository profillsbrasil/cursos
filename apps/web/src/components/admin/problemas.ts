// Sem "use client": as duas telas e os testes importam.

import type { z } from "zod";

import { fmtNum } from "@/lib/formato";

export interface Problema {
  /** null: frase na barra de salvar. */
  campo: string | null;
  mensagem: string;
}

export type Problemas = readonly [Problema, ...Problema[]];

export function mensagemDoTexto(i: z.core.$ZodIssue): string | null {
  if (i.code === "too_small" && i.origin === "string") {
    return "Preencha este campo.";
  }
  if (i.code === "too_big" && i.origin === "string") {
    return `Use até ${fmtNum(Number(i.maximum))} caracteres.`;
  }
  if (i.code === "invalid_format" && i.path.at(-1) === "slug") {
    return "Use letras minúsculas, números e hífen, sem espaço.";
  }
  return null;
}

export const fraseDeReserva = (
  oQue: "A trilha" | "O curso",
  caminho: readonly PropertyKey[]
) =>
  `${oQue} tem um valor que o servidor recusa (${caminho.map(String).join(".") || "documento"}). Recarregue a página e tente de novo.`;

export function semRepetir([primeiro, ...resto]: Problemas): Problemas {
  const chave = (p: Problema) => p.campo ?? `frase:${p.mensagem}`;
  const vistos = new Set([chave(primeiro)]);
  return [
    primeiro,
    ...resto.filter((p) => {
      if (vistos.has(chave(p))) {
        return false;
      }
      vistos.add(chave(p));
      return true;
    }),
  ];
}

export const naoVazia = (
  problemas: readonly Problema[]
): problemas is Problemas => problemas.length > 0;

export interface Recusa<C extends string> {
  campo: C;
  mensagem: string;
  valor: string;
}

export function recusaNaTela<C extends string>(
  recusa: Recusa<C> | null,
  valores: Readonly<Record<C, string | null>>,
  idDe: (campo: C) => string
): Problema[] {
  if (recusa === null || (valores[recusa.campo] ?? "") !== recusa.valor) {
    return [];
  }
  return [{ campo: idDe(recusa.campo), mensagem: recusa.mensagem }];
}

export const errosPorCampo = (
  problemas: readonly Problema[]
): ReadonlyMap<string, string> =>
  new Map(
    problemas.flatMap((p) => (p.campo ? [[p.campo, p.mensagem] as const] : []))
  );
