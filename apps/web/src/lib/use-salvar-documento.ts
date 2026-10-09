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

/** O que o editor mostra depois de salvar. */
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
  /** Quantas vezes o admin clicou Recarregar; o editor descarta o rascunho a cada uma. */
  descartes: number;
  pendente: boolean;
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

  const [descartes, setDescartes] = useState(0);
  const recarregar = useCallback(() => {
    setVersaoMudou(false);
    setDescartes((n) => n + 1);
    router.refresh();
  }, [router]);

  return { descartes, pendente, recarregar, salvar, versaoMudou };
}

/**
 * Na navegação do App Router, o link clicado sai do DOM e o foco cai no
 * <body>; o editor que abre assim põe o foco no título.
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
