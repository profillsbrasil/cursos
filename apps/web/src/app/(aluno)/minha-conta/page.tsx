import type { Metadata } from "next";

import { TelaDaMinhaConta } from "@/components/minha-conta/tela-da-minha-conta";
import { carregarConquistas } from "@/server/api";

export const metadata: Metadata = { title: "Minha conta" };

export default async function PaginaDaMinhaConta() {
  const { certificados } = await carregarConquistas();
  return (
    <TelaDaMinhaConta
      certificados={certificados.filter((c) => c.estado === "ganha").length}
    />
  );
}
