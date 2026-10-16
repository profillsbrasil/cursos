import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { CORPO_DA_CONFERENCIA } from "@/components/certificado/conferencia";
import { LOCKUP, PRODUTO } from "@/lib/marca";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Conferir certificado",
};

export default function LayoutDaConferencia({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex h-14 items-center justify-between border-border border-b bg-sidebar px-4 md:h-[68px] md:px-8">
        <Image
          alt={PRODUTO}
          height={34}
          priority
          src={LOCKUP.src}
          width={120}
        />
        <Link
          className="inline-flex items-center gap-1.5 rounded-md px-0.5 py-1 font-semibold text-[13px] text-ceu transition-colors duration-150 hover:text-titulo"
          href="/meus-cursos"
        >
          Entrar
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </header>
      <main className={CORPO_DA_CONFERENCIA}>{children}</main>
    </div>
  );
}
