import { cn } from "@cursos/ui/lib/utils";
import type { Route } from "next";
import Link from "next/link";

const ABAS = [
  { href: "/admin/liberacoes" as Route, id: "pessoa", rotulo: "Por pessoa" },
  {
    href: "/admin/liberacoes/perfis" as Route,
    id: "perfil",
    rotulo: "Por perfil",
  },
] as const;

/** As duas telas de Liberações, como links: cada aba é um endereço. */
export function AbasDasLiberacoes({
  ativa,
}: {
  ativa: (typeof ABAS)[number]["id"];
}) {
  return (
    <nav aria-label="Liberar por" className="mb-7">
      <ul className="inline-flex gap-1 rounded-full bg-sidebar p-1 ring-1 ring-border">
        {ABAS.map((a) => (
          <li key={a.id}>
            <Link
              aria-current={a.id === ativa ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-full px-4 font-semibold text-[13px] transition-colors",
                a.id === ativa
                  ? "bg-popover text-titulo"
                  : "text-foreground hover:bg-white/8"
              )}
              href={a.href}
            >
              {a.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
