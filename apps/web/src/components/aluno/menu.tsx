import { BookOpen, Gift, Medal, Megaphone, ShieldCheck } from "lucide-react";

import type { ItemDoMenu, LinkDaArea } from "@/components/casca/nav";

export const ITENS_DO_ALUNO: readonly ItemDoMenu[] = [
  {
    href: "/meus-cursos",
    icone: <BookOpen />,
    nome: "Meus cursos",
    outrosPrefixos: ["/cursos"],
    tipo: "link",
  },
  {
    href: "/trocar-pontos",
    icone: <Gift />,
    nome: "Trocar pontos",
    outrosPrefixos: [],
    tipo: "link",
  },
  {
    href: "/conquistas",
    icone: <Medal />,
    nome: "Conquistas",
    outrosPrefixos: [],
    tipo: "link",
  },
  {
    href: "/comunicados",
    icone: <Megaphone />,
    nome: "Comunicados",
    outrosPrefixos: [],
    tipo: "link",
  },
];

/** Entra no menu da conta só para quem tem o papel admin: o layout do aluno decide. */
export const AREA_DO_ADMIN: LinkDaArea = {
  href: "/admin",
  icone: <ShieldCheck />,
  nome: "Área do admin",
};
