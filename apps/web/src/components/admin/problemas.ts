// O que os editores do curso e da trilha mostram quando o documento não passa
// no schema do servidor. Sem "use client": as duas telas e os testes importam.

import type { z } from "zod";

import { fmtNum } from "@/lib/formato";

export interface Problema {
  /** O id do elemento que o problema marca e foca. null: frase na barra de salvar. */
  campo: string | null;
  mensagem: string;
}

/** O schema recusou: sempre há pelo menos um problema para mostrar. */
export type Problemas = readonly [Problema, ...Problema[]];

/** Frase das recusas de texto do schema (vazio, longo, formato do slug); null para as outras. */
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

/** O schema recusou algo que a tela não mostra num campo. */
export const fraseDeReserva = (
  oQue: "A trilha" | "O curso",
  caminho: readonly PropertyKey[]
) =>
  `${oQue} tem um valor que o servidor recusa (${caminho.map(String).join(".") || "documento"}). Recarregue a página e tente de novo.`;

/** Um problema por campo (o primeiro) e uma frase por mensagem; nunca vazio. */
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

/** O servidor recusou o valor de um campo, como o endereço que outro já usa. */
export interface Recusa<C extends string> {
  campo: C;
  mensagem: string;
  valor: string;
}

/** A recusa marca o campo enquanto o valor dele é o que o servidor recusou. */
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

/** O mapa que o ErrosDoEditor recebe: id do campo para a mensagem. */
export const errosPorCampo = (
  problemas: readonly Problema[]
): ReadonlyMap<string, string> =>
  new Map(
    problemas.flatMap((p) => (p.campo ? [[p.campo, p.mensagem] as const] : []))
  );
