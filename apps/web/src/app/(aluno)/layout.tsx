import { SidebarInset, SidebarProvider } from "@cursos/ui/components/sidebar";
import { cookies } from "next/headers";
import { type CSSProperties, Suspense } from "react";

import { AppSidebar } from "@/components/aluno/app-sidebar";
import { Chips, ChipsCarregando, Topo } from "@/components/aluno/topo";
import { carregarResumo } from "@/server/api";

async function ChipsComResumo() {
  return <Chips resumo={await carregarResumo()} />;
}

// Conteúdo em largura total: nenhum ancestral do conteúdo tem max-width, container ou mx-auto.
// O layout não espera o banco: só os chips do topo carregam o resumo atrás de um
// Suspense, e a casca com a sidebar, o topo e o loading.tsx da página aparecem logo.
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
          <Topo
            chips={
              <Suspense fallback={<ChipsCarregando />}>
                <ChipsComResumo />
              </Suspense>
            }
          />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
