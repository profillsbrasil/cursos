"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useReducer,
} from "react";

import { type EstadoDoLote, type EventoDoLote, LOTE_VAZIO, lote } from "./lote";

const Lote = createContext<{
  despachar: Dispatch<EventoDoLote>;
  estado: EstadoDoLote;
} | null>(null);

export function ProvedorDoLote({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(lote, LOTE_VAZIO);
  return <Lote value={{ despachar, estado }}>{children}</Lote>;
}

export function useLote() {
  const valor = useContext(Lote);
  if (!valor) {
    throw new Error("useLote fora do ProvedorDoLote.");
  }
  return valor;
}
