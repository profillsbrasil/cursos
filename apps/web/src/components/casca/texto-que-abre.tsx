"use client";

import { cn } from "@cursos/ui/lib/utils";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

type Estado = "cabe" | "cortado" | "aberto";

/**
 * Texto longo na largura toda da coluna, cortado em três linhas. O "Ler mais" só aparece
 * quando o corte esconde alguma coisa, e a medida se refaz quando a largura muda.
 */
export function TextoQueAbre({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [estado, setEstado] = useState<Estado>("cabe");

  useLayoutEffect(() => {
    const p = ref.current;
    if (!p || estado === "aberto") {
      return;
    }
    const medir = () =>
      setEstado(p.scrollHeight > p.clientHeight ? "cortado" : "cabe");
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(p);
    return () => observador.disconnect();
  }, [estado]);

  const alternar = useCallback(
    () => setEstado((atual) => (atual === "aberto" ? "cortado" : "aberto")),
    []
  );

  return (
    <div className="grid justify-items-start gap-1">
      <p
        className={cn(className, estado !== "aberto" && "line-clamp-3")}
        ref={ref}
      >
        {children}
      </p>
      {estado === "cabe" ? null : (
        <button
          aria-expanded={estado === "aberto"}
          className="toque cursor-pointer rounded-md font-semibold text-ceu transition-colors hover:text-titulo"
          onClick={alternar}
          type="button"
        >
          {estado === "aberto" ? "Ler menos" : "Ler mais"}
        </button>
      )}
    </div>
  );
}
