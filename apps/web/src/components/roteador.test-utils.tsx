import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import type { ReactNode } from "react";

/** Uma chamada que o componente fez ao roteador do App Router. */
export type ChamadaDoRoteador =
  | { href: string; metodo: "prefetch" | "push" | "replace" }
  | { metodo: "back" | "forward" | "refresh" };

/** O roteador do App Router nos testes: não navega e guarda cada chamada em `chamadas`, na ordem. */
export function roteadorDeTeste(): {
  chamadas: ChamadaDoRoteador[];
  roteador: AppRouterInstance;
} {
  const chamadas: ChamadaDoRoteador[] = [];

  return {
    chamadas,
    roteador: {
      back: () => {
        chamadas.push({ metodo: "back" });
      },
      bfcacheId: "_b_0_",
      forward: () => {
        chamadas.push({ metodo: "forward" });
      },
      prefetch: (href) => {
        chamadas.push({ href, metodo: "prefetch" });
      },
      push: (href) => {
        chamadas.push({ href, metodo: "push" });
      },
      refresh: () => {
        chamadas.push({ metodo: "refresh" });
      },
      replace: (href) => {
        chamadas.push({ href, metodo: "replace" });
      },
    },
  };
}

const SEM_REGISTRO = roteadorDeTeste().roteador;

/**
 * Os contextos reais do App Router em volta do componente: o `useRouter`, o
 * `usePathname` e o `useSearchParams` do `next/navigation` leem daqui, como na página.
 */
export function ComRoteador({
  busca = "",
  caminho = "/",
  children,
  roteador = SEM_REGISTRO,
}: {
  busca?: string;
  caminho?: string;
  children: ReactNode;
  roteador?: AppRouterInstance;
}) {
  return (
    <AppRouterContext.Provider value={roteador}>
      <PathnameContext.Provider value={caminho}>
        <SearchParamsContext.Provider value={new URLSearchParams(busca)}>
          {children}
        </SearchParamsContext.Provider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );
}
