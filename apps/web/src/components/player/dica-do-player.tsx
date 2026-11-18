"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@cursos/ui/lib/utils";
import { createContext, type ReactNode, type RefObject, use } from "react";

import { DICA } from "@/components/casca/estilo";

export const PortalDoPlayer =
  createContext<RefObject<HTMLElement | null> | null>(null);

/**
 * O `TooltipContent` do `@cursos/ui` nasce no `body`, e a tela cheia só mostra o
 * player: a dica dos controles nasce dentro dele, presa à janela pelo `fixed`, como os
 * Ajustes. O resto copia o `TooltipContent`.
 */
export function DicaDoPlayer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const portal = use(PortalDoPlayer);

  return (
    <TooltipPrimitive.Portal container={portal ?? undefined}>
      <TooltipPrimitive.Positioner
        className="isolate z-50"
        positionMethod="fixed"
        side="top"
        sideOffset={4}
      >
        <TooltipPrimitive.Popup
          className={cn(
            "data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 bg-foreground text-background data-[state=delayed-open]:animate-in data-closed:animate-out data-open:animate-in z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 px-3 py-1.5 text-xs",
            DICA,
            className
          )}
          data-slot="tooltip-content"
        >
          {children}
          <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 data-[side=top]:-bottom-2.5" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}
