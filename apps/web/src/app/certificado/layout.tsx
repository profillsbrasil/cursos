import { auth } from "@clerk/nextjs/server";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { PaginaPublica } from "@/components/casca/pagina-publica";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Conferir certificado",
};

// O proxy.ts roda o clerkMiddleware em toda rota, então o auth() lê a sessão
// sem o ClerkProvider, que esta página pública não carrega.
export default async function LayoutDaConferencia({
  children,
}: {
  children: ReactNode;
}) {
  const { userId } = await auth();
  return (
    <PaginaPublica
      direita={
        <Link
          className="toque inline-flex items-center gap-1.5 rounded-md px-0.5 py-1 font-semibold text-[13px] text-ceu transition-colors duration-150 hover:text-titulo"
          href="/meus-cursos"
        >
          {userId ? "Meus cursos" : "Entrar"}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      }
    >
      {children}
    </PaginaPublica>
  );
}
