import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

import { TelaDeEntrada } from "@/components/entrada/tela-de-entrada";
import { ProvedorDoClerk } from "@/components/provedor-do-clerk";
import { CRIAR_CONTA, ENTRAR } from "@/lib/rotas";

export const metadata: Metadata = { title: "Entrar" };

export default function Entrar() {
  return (
    <ProvedorDoClerk>
      <TelaDeEntrada>
        <SignIn path={ENTRAR} signUpUrl={CRIAR_CONTA} />
      </TelaDeEntrada>
    </ProvedorDoClerk>
  );
}
