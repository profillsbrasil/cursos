"use client";

import { Library, Megaphone, Users } from "lucide-react";

import {
  type ItemDoMenu,
  NavPrincipal,
} from "@/components/aluno/nav-principal";

const ITENS_DO_ADMIN: readonly ItemDoMenu[] = [
  { icone: Users, nome: "Alunos", tipo: "em_breve" },
  {
    href: "/admin/catalogo",
    icone: Library,
    nome: "Catálogo",
    outrosPrefixos: [],
    tipo: "link",
  },
  { icone: Megaphone, nome: "Comunicados", tipo: "em_breve" },
];

export function NavDoAdmin() {
  return <NavPrincipal itens={ITENS_DO_ADMIN} rotulo="Navegação do admin" />;
}
