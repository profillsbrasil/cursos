"use client";

import type { Motivo } from "@cursos/api";
import { TRPCClientError } from "@trpc/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

const ERRO_GENERICO = "Não deu para salvar. Tente de novo em instantes.";

export interface OpcoesDaAcao<T> {
  /**
   * Com esta opção, a falha não recarrega a página: um editor guarda o rascunho e
   * decide pelo motivo (por exemplo, oferecer "Recarregar" em versao_mudou).
   */
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

/** Só ErroParaAPessoa, no servidor, chega com essa marca (errorFormatter). */
const paraAPessoa = (e: unknown): string | null =>
  e instanceof TRPCClientError && e.data?.paraAPessoa === true
    ? e.message
    : null;

/**
 * O corpo do useAcao, sem React. A página recarrega os dados do servidor no
 * fim, com sucesso ou recusa, porque a recusa costuma dizer que a tela ficou velha.
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
    efeitos.toast.error(paraAPessoa(e) ?? opcoes.erro ?? ERRO_GENERICO);
    if (opcoes.aoRecusar) {
      opcoes.aoRecusar(
        e instanceof TRPCClientError ? (e.data?.motivo ?? null) : null
      );
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
