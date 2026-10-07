import { UserButton } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@cursos/ui/components/sidebar";

import { NavPrincipal } from "./nav-principal";

export function AppSidebar() {
  return (
    <Sidebar variant="sidebar">
      <SidebarHeader className="px-5 pt-6 pb-5">
        <p className="flex items-center gap-2.5 font-bold text-base text-titulo tracking-tight">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-[10px] bg-sol font-extrabold text-sobre-cor"
          >
            P
          </span>
          Profills{" "}
          <span className="font-medium text-muted-foreground">School</span>
        </p>
      </SidebarHeader>
      <SidebarContent className="px-3.5">
        <NavPrincipal />
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border border-t px-5 pt-3.5 pb-5">
        <UserButton showName />
      </SidebarFooter>
    </Sidebar>
  );
}
