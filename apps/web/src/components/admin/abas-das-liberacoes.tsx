import type { Route } from "next";
import Link from "next/link";

import { OPCAO_DA_TRILHA, TRILHA } from "./partes";

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
      <ul className={TRILHA}>
        {ABAS.map((a) => (
          <li key={a.id}>
            <Link
              aria-current={a.id === ativa ? "page" : undefined}
              className={OPCAO_DA_TRILHA}
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
