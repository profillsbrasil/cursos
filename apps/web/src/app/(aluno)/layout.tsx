import { SidebarInset, SidebarProvider } from "@cursos/ui/components/sidebar";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";

import { AppSidebar } from "@/components/aluno/app-sidebar";

// Conteúdo em largura total: nenhum ancestral do conteúdo tem max-width, container ou mx-auto.
// O layout não espera o banco. O topo com os chips é de cada página (TopoDoAluno),
// e o loading.tsx de cada página mostra o topo com os chips carregando.
export default async function LayoutDoAluno({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const aberta = cookieStore.get("sidebar_state")?.value !== "false";
  return (
    <SidebarProvider
      defaultOpen={aberta}
      style={{ "--sidebar-width": "15.5rem" } as CSSProperties}
    >
      <AppSidebar />
      <SidebarInset>
        <div className="min-w-0 px-[clamp(1rem,4vw,3rem)] pt-8 pb-16">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
