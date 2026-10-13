import {
  Award,
  BookOpen,
  Gift,
  House,
  Megaphone,
  ShieldCheck,
} from "lucide-react";

import type { ItemDoMenu, LinkDaArea } from "@/components/casca/nav";

export const ITENS_DO_ALUNO: readonly ItemDoMenu[] = [
  { icone: <House />, nome: "Início", tipo: "em_breve" },
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
  { icone: <Award />, nome: "Conquistas", tipo: "em_breve" },
  { icone: <Megaphone />, nome: "Comunicados", tipo: "em_breve" },
];

/** Entra no menu da conta só para quem tem o papel admin: o layout do aluno decide. */
export const AREA_DO_ADMIN: LinkDaArea = {
  href: "/admin",
  icone: <ShieldCheck />,
  nome: "Área do admin",
};
