import {
  ArrowLeftRight,
  KeyRound,
  Library,
  Megaphone,
  Tag,
  Users,
} from "lucide-react";

import type { ItemDoMenu, LinkDaArea } from "@/components/casca/nav";

export const ITENS_DO_ADMIN: readonly ItemDoMenu[] = [
  {
    href: "/admin/pessoas",
    icone: <Users />,
    nome: "Pessoas",
    outrosPrefixos: [],
    tipo: "link",
  },
  {
    href: "/admin/liberacoes",
    icone: <KeyRound />,
    nome: "Liberações",
    outrosPrefixos: [],
    tipo: "link",
  },
  {
    href: "/admin/catalogo",
    icone: <Library />,
    nome: "Catálogo",
    outrosPrefixos: [],
    tipo: "link",
  },
  {
    href: "/admin/categorias",
    icone: <Tag />,
    nome: "Categorias",
    outrosPrefixos: [],
    tipo: "link",
  },
  {
    href: "/admin/comunicados",
    icone: <Megaphone />,
    nome: "Comunicados",
    outrosPrefixos: [],
    tipo: "link",
  },
];

export const VER_COMO_ALUNO: LinkDaArea = {
  href: "/meus-cursos",
  icone: <ArrowLeftRight />,
  nome: "Ver como aluno",
};
