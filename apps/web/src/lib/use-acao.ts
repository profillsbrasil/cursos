"use client";

import type { Motivo } from "@cursos/api";
import type { AppRouter } from "@cursos/api/routers/index";
import { isTRPCClientError } from "@trpc/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

const ERRO_GENERICO = "Não deu para salvar. Tente de novo em instantes.";

export interface OpcoesDaAcao<T> {
  aoRecusar?: (motivo: Motivo | null) => void;
  depois?: (resultado: T) => void;
  /** Texto do toast quando o erro não traz mensagem escrita para a pessoa. */
  erro?: string;
  sucesso?: string | ((resultado: T) => string);
}

interface Efeitos {
  atualizar: () => void;
  toast: { error: (texto: string) => void; success: (texto: string) => void };
}

/**
 * Toda recusa do servidor recarrega, versao_mudou inclusive: o editor do curso
 * guarda o rascunho sujo e só liga o aviso, e o Recarregar já encontra a
 * página nova. O erro de rede não recarrega: router.refresh sem resposta do
 * servidor vira navegação de página inteira, que perde o rascunho.
 */
export async function rodarAcao<T>(
  fazer: () => Promise<T>,
  opcoes: OpcoesDaAcao<T>,
  efeitos: Efeitos
): Promise<void> {
  try {
    const r = await fazer();
    const sucesso =
      typeof opcoes.sucesso === "function" ? opcoes.sucesso(r) : opcoes.sucesso;
    if (sucesso) {
      efeitos.toast.success(sucesso);
    }
    opcoes.depois?.(r);
  } catch (e) {
    // Erro de rede chega sem data: o servidor não respondeu.
    const recusa =
      isTRPCClientError<AppRouter>(e) && e.data
        ? { ...e.data, mensagem: e.message }
        : null;
    efeitos.toast.error(
      recusa?.paraAPessoa ? recusa.mensagem : (opcoes.erro ?? ERRO_GENERICO)
    );
    opcoes.aoRecusar?.(recusa?.motivo ?? null);
    if (recusa === null) {
      return;
    }
  }
  efeitos.atualizar();
}

export interface Acao {
  executar: <T>(fazer: () => Promise<T>, opcoes?: OpcoesDaAcao<T>) => void;
  pendente: boolean;
}

/**
 * O caminho das mutações que a pessoa dispara: a chamada roda numa transition,
 * e `pendente` vale até a página recarregada aparecer.
 */
export function useAcao(): Acao {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return {
    executar: (fazer, opcoes = {}) =>
      iniciar(() =>
        rodarAcao(fazer, opcoes, { atualizar: () => router.refresh(), toast })
      ),
    pendente,
  };
}
