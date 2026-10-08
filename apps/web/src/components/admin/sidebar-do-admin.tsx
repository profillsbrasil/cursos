import { UserButton } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@cursos/ui/components/sidebar";
import { ArrowLeftRight } from "lucide-react";

import {
  LinkDoRodape,
  MarcaDaSidebar,
} from "@/components/aluno/partes-da-sidebar";

import { NavDoAdmin } from "./nav-do-admin";

export function SidebarDoAdmin() {
  return (
    <Sidebar variant="sidebar">
      <SidebarHeader className="px-5 pt-6 pb-5">
        <MarcaDaSidebar
          selo={
            <span className="ml-auto rounded-full bg-ceu/14 px-2 py-0.5 font-semibold text-ceu text-xs tracking-normal">
              Admin
            </span>
          }
        />
      </SidebarHeader>
      <SidebarContent className="px-3.5">
        <NavDoAdmin />
      </SidebarContent>
      <SidebarFooter className="gap-3 border-sidebar-border border-t px-5 pt-3.5 pb-5">
        <LinkDoRodape href="/meus-cursos" icone={<ArrowLeftRight />}>
          Ver como aluno
        </LinkDoRodape>
        <UserButton showName />
      </SidebarFooter>
    </Sidebar>
  );
}
