"use client";

import { TRPCClientError } from "@trpc/client";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { toast } from "sonner";

/**
 * Códigos que o servidor só lança com mensagem nossa, em pt-BR, escrita para a
 * pessoa. BAD_REQUEST fica de fora porque é o zod da entrada, em inglês;
 * INTERNAL_SERVER_ERROR fica de fora para não mostrar texto do Postgres.
 */
export const MOSTRA_A_MENSAGEM: ReadonlySet<string> = new Set([
  "CONFLICT",
  "FORBIDDEN",
  "NOT_FOUND",
  "PRECONDITION_FAILED",
]);

const ERRO_GENERICO = "Não deu para salvar. Tente de novo em instantes.";

export interface OpcoesDaAcao<T> {
  depois?: (resultado: T) => void;
  /** Texto do toast quando o erro não traz mensagem nossa. */
  erro?: string;
  sucesso?: string;
}

export interface Acao {
  executar: <T>(fazer: () => Promise<T>, opcoes?: OpcoesDaAcao<T>) => void;
  pendente: boolean;
}

/**
 * O único jeito de uma tela mudar algo no servidor: a chamada roda numa
 * transition, o erro vira toast e a página recarrega os dados do servidor no
 * fim, com sucesso ou recusa, porque a recusa costuma dizer que a tela ficou velha.
 */
export function useAcao(): Acao {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const executar = useCallback(
    <T>(fazer: () => Promise<T>, opcoes?: OpcoesDaAcao<T>) => {
      iniciar(async () => {
        try {
          const r = await fazer();
          if (opcoes?.sucesso) {
            toast.success(opcoes.sucesso);
          }
          opcoes?.depois?.(r);
        } catch (e) {
          const nossa =
            e instanceof TRPCClientError && MOSTRA_A_MENSAGEM.has(e.data?.code);
          toast.error(nossa ? e.message : (opcoes?.erro ?? ERRO_GENERICO));
        }
        router.refresh();
      });
    },
    [router]
  );
  return { executar, pendente };
}
