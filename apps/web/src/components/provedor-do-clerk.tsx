import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

import { APARENCIA_CLERK, TEXTOS_CLERK } from "@/components/entrada/clerk";
import { ClerkApiAuthBridge } from "@/components/ponte-do-clerk";
import { CRIAR_CONTA, ENTRAR } from "@/lib/rotas";

/**
 * Fica nos layouts que usam a conta (aluno, admin, entrar e criar conta), e não
 * no raiz: a conferência pública do certificado não tem login, e o provedor
 * levava a ela o JS do Clerk, dois pedidos à API dele e os textos do ptBR.
 */
export function ProvedorDoClerk({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={APARENCIA_CLERK}
      localization={TEXTOS_CLERK}
      signInFallbackRedirectUrl="/meus-cursos"
      signInUrl={ENTRAR}
      signUpFallbackRedirectUrl="/meus-cursos"
      signUpUrl={CRIAR_CONTA}
    >
      <ClerkApiAuthBridge />
      {children}
    </ClerkProvider>
  );
}
