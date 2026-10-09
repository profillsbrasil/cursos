"use client";

import type { Motivo } from "@cursos/api";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAcao } from "./use-acao";

export interface OpcoesDeSalvar<T> {
  aoRecusar?: (motivo: Motivo | null) => void;
  aoSalvar?: (resultado: T) => void;
  sucesso: string;
}

export interface SalvarDocumento {
  /** Quantas vezes o admin clicou Recarregar; o editor descarta o rascunho a cada uma. */
  descartes: number;
  pendente: boolean;
  recarregar: () => void;
  salvar: <T>(fazer: () => Promise<T>, opcoes: OpcoesDeSalvar<T>) => void;
}

export function useSalvarDocumento({
  caminho,
  novo,
}: {
  caminho: Route;
  novo: boolean;
}): SalvarDocumento {
  const router = useRouter();
  const { executar, pendente } = useAcao();

  const salvar = useCallback(
    <T>(fazer: () => Promise<T>, opcoes: OpcoesDeSalvar<T>) => {
      executar(fazer, {
        aoRecusar: opcoes.aoRecusar,
        depois: (r) => {
          opcoes.aoSalvar?.(r);
          // O documento novo perde o ?novo=1 depois do primeiro salvar.
          if (novo) {
            router.replace(caminho);
          }
        },
        sucesso: opcoes.sucesso,
      });
    },
    [caminho, executar, novo, router]
  );

  const [descartes, setDescartes] = useState(0);
  const recarregar = useCallback(() => {
    setDescartes((n) => n + 1);
    router.refresh();
  }, [router]);

  return { descartes, pendente, recarregar, salvar };
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
