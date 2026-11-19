"use client";

import { useReverification } from "@clerk/nextjs";
import { useCallback, useTransition } from "react";
import { toast } from "sonner";

import { fraseDoErro } from "./erros";

interface OpcoesDaAcao<T> {
  depois?: (resultado: T) => void;
  sensivel?: boolean;
  sucesso?: string;
}

/**
 * O caminho das ações da conta, que vão direto ao Clerk e não ao tRPC: o
 * retorno sai em toast, e a recusa, pela frase de `fraseDoErro`.
 */
export function useAcaoDaConta() {
  const [pendente, iniciar] = useTransition();

  const comConfirmacao = useReverification((fazer: () => Promise<unknown>) =>
    fazer()
  );

  const executar = useCallback(
    <T>(fazer: () => Promise<T>, opcoes: OpcoesDaAcao<T> = {}) =>
      iniciar(async () => {
        let resultado: T;

        try {
          resultado = opcoes.sensivel
            ? ((await comConfirmacao(fazer)) as T)
            : await fazer();
        } catch (e) {
          toast.error(fraseDoErro(e));

          return;
        }

        if (opcoes.sucesso) {
          toast.success(opcoes.sucesso);
        }

        opcoes.depois?.(resultado);
      }),
    [comConfirmacao]
  );

  return { executar, pendente };
}
