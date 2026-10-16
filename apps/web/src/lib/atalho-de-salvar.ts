"use client";

import { type RefObject, useEffect } from "react";

type Tecla = Pick<
  KeyboardEvent,
  "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey"
>;

/** Ctrl+S e, no Mac, Cmd+S, sem Alt nem Shift. */
export const ehAtalhoDeSalvar = (e: Tecla) =>
  (e.ctrlKey || e.metaKey) &&
  !(e.altKey || e.shiftKey) &&
  e.key.toLowerCase() === "s";

/**
 * Com o editor aberto, o atalho nunca abre o "salvar página" do navegador; ele
 * envia o formulário só quando há o que salvar, pelo mesmo caminho do botão.
 */
export function useAtalhoDeSalvar(
  formulario: RefObject<HTMLFormElement | null>,
  podeSalvar: boolean
) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (!ehAtalhoDeSalvar(e)) {
        return;
      }
      e.preventDefault();
      if (podeSalvar && !e.repeat) {
        formulario.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [formulario, podeSalvar]);
}
