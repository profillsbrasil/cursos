"use client";

import { useEffect } from "react";

// Na captura, antes do Link do Next: ele navega no clique que chega ao React.
// Sem nada de fora do corpo: o teste a roda no Chromium pelo texto dela.
export function guardarLinks(
  raiz: Document,
  confirmar: (aviso: string) => boolean
) {
  const aviso =
    "Você tem mudanças que não foram salvas. Sair mesmo assim e perdê-las?";
  const aoClicar = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0) {
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    const alvo = e.target instanceof Element ? e.target : null;
    const link = alvo?.closest("a[href]");
    if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") {
      return;
    }
    const destino = new URL(link.href, raiz.baseURI);
    const atual = new URL(raiz.baseURI);
    const mesmaPagina =
      destino.origin === atual.origin &&
      destino.pathname === atual.pathname &&
      destino.search === atual.search;
    if (mesmaPagina || confirmar(aviso)) {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  raiz.addEventListener("click", aoClicar, true);
  return () => raiz.removeEventListener("click", aoClicar, true);
}

// O Voltar do navegador fica sem aviso: o App Router não dá um ponto em que recusar o popstate.
export function useGuardaDeSaida(sujo: boolean) {
  useEffect(() => {
    if (!sujo) {
      return;
    }
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    const soltarLinks = guardarLinks(document, (aviso) =>
      // biome-ignore lint/suspicious/noAlert: só o confirm do navegador responde dentro do clique, antes de o Link navegar.
      window.confirm(aviso)
    );
    return () => {
      window.removeEventListener("beforeunload", avisar);
      soltarLinks();
    };
  }, [sujo]);
}
