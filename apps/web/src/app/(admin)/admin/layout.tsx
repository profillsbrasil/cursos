import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@cursos/ui/components/sidebar";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";

import { SidebarDoAdmin } from "@/components/admin/sidebar-do-admin";
import { exigirAdmin } from "@/server/api";

export const metadata: Metadata = { title: "Admin · Profills School" };

// proxy.ts não tem regra por caminho: a porta é exigirAdmin aqui e em cada carregador,
// mais o adminProcedure em cada procedimento.
export default async function LayoutDoAdmin({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await exigirAdmin();
  const aberta = (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <SidebarProvider
      defaultOpen={aberta}
      style={{ "--sidebar-width": "15.5rem" } as CSSProperties}
    >
      <SidebarDoAdmin />
      <SidebarInset>
        <div className="min-w-0 px-[clamp(1rem,4vw,3rem)] pt-8 pb-16">
          <SidebarTrigger
            aria-label="Mostrar ou esconder a navegação"
            className="mb-7 size-9 rounded-full"
          />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
