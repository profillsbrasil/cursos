import { UserButton } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@cursos/ui/components/sidebar";
import {
  Award,
  BookOpen,
  Gift,
  House,
  Megaphone,
  ShieldCheck,
} from "lucide-react";

import {
  type ItemDoMenu,
  NavPrincipal,
} from "@/components/casca/nav-principal";
import {
  LinkDoRodape,
  MarcaDaSidebar,
} from "@/components/casca/partes-da-sidebar";
import { souAdmin } from "@/server/api";

const ITENS_DO_ALUNO: readonly ItemDoMenu[] = [
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

export async function AppSidebar() {
  const admin = await souAdmin();
  return (
    <Sidebar variant="sidebar">
      <SidebarHeader className="px-5 pt-6 pb-5">
        <MarcaDaSidebar />
      </SidebarHeader>
      <SidebarContent className="px-3.5">
        <NavPrincipal itens={ITENS_DO_ALUNO} rotulo="Navegação principal" />
      </SidebarContent>
      <SidebarFooter className="gap-3 border-sidebar-border border-t px-5 pt-3.5 pb-5">
        {admin ? (
          <LinkDoRodape href="/admin" icone={<ShieldCheck />}>
            Área do admin
          </LinkDoRodape>
        ) : null}
        <UserButton showName />
      </SidebarFooter>
    </Sidebar>
  );
}
