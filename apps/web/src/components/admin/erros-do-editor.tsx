"use client";

import { FieldError } from "@cursos/ui/components/field";
import { createContext, useContext } from "react";

export const ErrosDoEditor = createContext<ReadonlyMap<string, string>>(
  new Map()
);

export function useErroDoCampo(id: string, descricao?: string) {
  const mensagem = useContext(ErrosDoEditor).get(id) ?? null;
  const descritos = [descricao, mensagem ? `${id}-erro` : null].filter(Boolean);
  return {
    aria: {
      "aria-describedby":
        descritos.length > 0 ? descritos.join(" ") : undefined,
      "aria-invalid": mensagem ? true : undefined,
    },
    mensagem,
  };
}

export function ErroDoCampo({
  id,
  mensagem,
}: {
  id: string;
  mensagem: string | null;
}) {
  return mensagem ? (
    <FieldError className="text-xs" id={`${id}-erro`}>
      {mensagem}
    </FieldError>
  ) : null;
}
