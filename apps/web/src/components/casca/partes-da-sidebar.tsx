import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

/** Cabeçalho das duas sidebars. `selo` diz em que área a pessoa está. */
export function MarcaDaSidebar({ selo }: { selo?: ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 font-bold text-base text-titulo tracking-tight">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-[10px] bg-sol font-extrabold text-sobre-cor"
      >
        P
      </span>
      Profills <span className="font-medium text-muted-foreground">School</span>
      {selo}
    </p>
  );
}

/** Link do rodapé que troca de área: "Área do admin" no aluno, "Ver como aluno" no admin. */
export function LinkDoRodape({
  children,
  href,
  icone,
}: {
  children: ReactNode;
  href: Route;
  icone: ReactNode;
}) {
  return (
    <Link
      className="-mx-2 flex h-10 items-center gap-3 rounded-lg px-2 font-medium text-sidebar-foreground text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground"
      href={href}
    >
      {icone}
      {children}
    </Link>
  );
}
