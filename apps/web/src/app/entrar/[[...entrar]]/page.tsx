import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

import { TelaDeEntrada } from "@/components/entrada/tela-de-entrada";
import { CRIAR_CONTA, ENTRAR } from "@/lib/rotas";

export const metadata: Metadata = { title: "Entrar" };

export default function Entrar() {
  return (
    <TelaDeEntrada>
      <SignIn path={ENTRAR} signUpUrl={CRIAR_CONTA} />
    </TelaDeEntrada>
  );
}
