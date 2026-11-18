import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

/** A volta à lista no topo das telas filhas: a ficha, o acesso e o editor. */
export function VoltaParaALista({ href, nome }: { href: Route; nome: string }) {
  return (
    <Link
      className="text-muted-foreground hover:text-foreground mb-5 inline-flex min-h-10 items-center gap-2 rounded-full pr-2 font-medium transition-colors"
      href={href}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {nome}
    </Link>
  );
}
