import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";

import "../index.css";
import { Geist, Geist_Mono } from "next/font/google";
import { APARENCIA_CLERK, TEXTOS_CLERK } from "@/components/entrada/clerk";
import Providers from "@/components/providers";
import PwaRegistration from "@/components/pwa-registration";
import { TITULO_DA_RAIZ } from "@/lib/marca";
import { CRIAR_CONTA, ENTRAR } from "@/lib/rotas";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description:
    "Cursos da Profills Brasil sobre máquinas, envase, vendas e rotinas.",
  title: TITULO_DA_RAIZ,
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#1A1D22",
};

// O app tem um tema só, escuro. A classe "dark" fica fixa no <html> para as
// variantes dark: dos componentes de packages/ui continuarem valendo.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
      lang="pt-BR"
    >
      <body className="antialiased">
        <PwaRegistration />

        <ClerkProvider
          appearance={APARENCIA_CLERK}
          localization={TEXTOS_CLERK}
          signInFallbackRedirectUrl="/meus-cursos"
          signInUrl={ENTRAR}
          signUpFallbackRedirectUrl="/meus-cursos"
          signUpUrl={CRIAR_CONTA}
        >
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
