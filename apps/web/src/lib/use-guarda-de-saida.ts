"use client";

import { useEffect } from "react";

/** A navegação dentro do app (links, sidebar) não passa por aqui. */
export function useGuardaDeSaida(sujo: boolean) {
  useEffect(() => {
    if (!sujo) {
      return;
    }
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sujo]);
}
