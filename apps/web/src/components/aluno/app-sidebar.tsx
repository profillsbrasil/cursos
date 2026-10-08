import { UserButton } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@cursos/ui/components/sidebar";
import { ShieldCheck } from "lucide-react";

import { souAdmin } from "@/server/api";

import { NavDoAluno } from "./nav-do-aluno";
import { LinkDoRodape, MarcaDaSidebar } from "./partes-da-sidebar";

export async function AppSidebar() {
  const admin = await souAdmin();
  return (
    <Sidebar variant="sidebar">
      <SidebarHeader className="px-5 pt-6 pb-5">
        <MarcaDaSidebar />
      </SidebarHeader>
      <SidebarContent className="px-3.5">
        <NavDoAluno />
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
