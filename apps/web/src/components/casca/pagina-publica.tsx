import Image from "next/image";
import type { ReactNode } from "react";

import { LOCKUP, PRODUTO } from "@/lib/marca";

/** O texto da falha para quem pode não ter entrado: sem falar do progresso. */
export const FALHA_SEM_LOGIN =
  "A conexão com o servidor falhou. Tente de novo em instantes.";

export const CORPO_DA_PAGINA_PUBLICA =
  "grid justify-items-center px-4 pt-7 pb-12 md:px-8 md:pt-12 md:pb-16";

/** A página fora da casca, que abre sem login: a faixa de topo com o lockup e o corpo centrado. */
export function PaginaPublica({
  children,
  direita,
}: {
  children: ReactNode;
  direita?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex h-14 items-center justify-between border-border border-b bg-sidebar px-4 md:h-[68px] md:px-8">
        <Image alt={PRODUTO} height={34} src={LOCKUP.src} width={120} />
        {direita}
      </header>
      <main className={CORPO_DA_PAGINA_PUBLICA}>{children}</main>
    </div>
  );
}
