"use client";

import type { Motivo } from "@cursos/api";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAcao } from "./use-acao";

export type Desfecho =
  | { tipo: "salvo" }
  | { tipo: "recusado"; motivo: Motivo | null };

export interface TelaDepoisDeSalvar {
  /** O documento novo ganhou a URL dele, sem o ?novo=1. */
  substituirPor: Route | null;
  /** Liga o AvisoDeVersaoMudou. */
  versaoMudou: boolean;
}

/**
 * O que o editor mostra depois de salvar. O resto vem do refresh do useAcao: no
 * sucesso, a página remonta o editor pela versão nova.
 */
export function telaDepoisDeSalvar(
  desfecho: Desfecho,
  { caminho, novo }: { caminho: Route; novo: boolean }
): TelaDepoisDeSalvar {
  if (desfecho.tipo === "salvo") {
    return { substituirPor: novo ? caminho : null, versaoMudou: false };
  }
  return {
    substituirPor: null,
    versaoMudou: desfecho.motivo === "versao_mudou",
  };
}

export interface OpcoesDeSalvar<T> {
  aoRecusar?: (motivo: Motivo | null) => void;
  /** Roda antes da troca de URL e do refresh. */
  aoSalvar?: (resultado: T) => void;
  sucesso: string;
}

export interface SalvarDocumento {
  pendente: boolean;
  /** Descarta o rascunho: a página volta com a versão do banco. */
  recarregar: () => void;
  salvar: <T>(fazer: () => Promise<T>, opcoes: OpcoesDeSalvar<T>) => void;
  versaoMudou: boolean;
}

/**
 * O salvar dos editores de documento (curso, trilha). `caminho` é a URL do
 * documento sem o ?novo=1; `novo`, se ele ainda não existe no banco.
 */
export function useSalvarDocumento({
  caminho,
  novo,
}: {
  caminho: Route;
  novo: boolean;
}): SalvarDocumento {
  const router = useRouter();
  const { executar, pendente } = useAcao();
  const [versaoMudou, setVersaoMudou] = useState(false);

  const mostrar = useCallback(
    (desfecho: Desfecho) => {
      const tela = telaDepoisDeSalvar(desfecho, { caminho, novo });
      setVersaoMudou(tela.versaoMudou);
      if (tela.substituirPor) {
        router.replace(tela.substituirPor);
      }
    },
    [caminho, novo, router]
  );

  const salvar = useCallback(
    <T>(fazer: () => Promise<T>, opcoes: OpcoesDeSalvar<T>) => {
      setVersaoMudou(false);
      executar(fazer, {
        aoRecusar: (motivo) => {
          mostrar({ motivo, tipo: "recusado" });
          opcoes.aoRecusar?.(motivo);
        },
        depois: (r) => {
          opcoes.aoSalvar?.(r);
          mostrar({ tipo: "salvo" });
        },
        sucesso: opcoes.sucesso,
      });
    },
    [executar, mostrar]
  );

  const recarregar = useCallback(() => router.refresh(), [router]);

  return { pendente, recarregar, salvar, versaoMudou };
}

/**
 * O título da página com foco quando o editor monta sem foco em lugar nenhum:
 * depois de salvar, a key por versão remonta o editor, o botão Salvar sai do
 * DOM e o foco cairia no <body>. O h1 precisa de tabIndex={-1}.
 */
export function useTituloComFoco<T extends HTMLElement>() {
  const titulo = useRef<T>(null);
  useEffect(() => {
    const ativo = document.activeElement;
    if (ativo === null || ativo === document.body) {
      titulo.current?.focus({ preventScroll: true });
    }
  }, []);
  return titulo;
}
