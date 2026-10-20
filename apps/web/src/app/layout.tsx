import type { Metadata, Viewport } from "next";

import "../index.css";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/components/providers";
import PwaRegistration from "@/components/pwa-registration";
import { TITULO_DA_RAIZ } from "@/lib/marca";

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

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
