import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

import { TelaDeEntrada } from "@/components/entrada/tela-de-entrada";
import { CRIAR_CONTA, ENTRAR } from "@/lib/rotas";

export const metadata: Metadata = { title: "Criar conta" };

export default function CriarConta() {
  return (
    <TelaDeEntrada>
      <SignUp path={CRIAR_CONTA} signInUrl={ENTRAR} />
    </TelaDeEntrada>
  );
}
