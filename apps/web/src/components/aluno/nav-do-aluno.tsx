"use client";

import { Award, BookOpen, Gift, House, Megaphone } from "lucide-react";

import { type ItemDoMenu, NavPrincipal } from "./nav-principal";

const ITENS_DO_ALUNO: readonly ItemDoMenu[] = [
  { icone: House, nome: "Início", tipo: "em_breve" },
  {
    href: "/meus-cursos",
    icone: BookOpen,
    nome: "Meus cursos",
    outrosPrefixos: ["/cursos"],
    tipo: "link",
  },
  {
    href: "/trocar-pontos",
    icone: Gift,
    nome: "Trocar pontos",
    outrosPrefixos: [],
    tipo: "link",
  },
  { icone: Award, nome: "Conquistas", tipo: "em_breve" },
  { icone: Megaphone, nome: "Comunicados", tipo: "em_breve" },
];

export function NavDoAluno() {
  return <NavPrincipal itens={ITENS_DO_ALUNO} rotulo="Navegação principal" />;
}
