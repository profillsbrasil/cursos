import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";

import "../index.css";
import { Geist, Geist_Mono } from "next/font/google";

import Providers from "@/components/providers";
import PwaRegistration from "@/components/pwa-registration";

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
  title: "Profills School",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#1A1D22",
};

// O app tem um tema só, escuro. A classe "dark" fica fixa no <html> para as
// variantes dark: dos componentes de packages/ui continuarem valendo.
const APARENCIA_CLERK = {
  variables: {
    colorBackground: "#33383E",
    colorBorder: "#40454A",
    colorForeground: "#E9ECEF",
    colorInput: "#1A1D22",
    colorInputForeground: "#E9ECEF",
    colorMutedForeground: "#A8ACB0",
    colorPrimary: "#FFCC01",
    colorPrimaryForeground: "#22262B",
    colorRing: "#AAD2EA",
  },
};

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

        <ClerkProvider appearance={APARENCIA_CLERK}>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
