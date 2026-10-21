import { cn } from "@cursos/ui/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BOTAO } from "@/components/casca/botoes";
import { CARTAO } from "@/components/casca/cartoes";

// Corpo dos not-found.tsx do app: diz o que faltou e leva de volta, por padrão
// a Meus cursos; o admin passa as voltas dele.
export function TelaNaoEncontrada({
  acao = "Voltar para Meus cursos",
  children,
  texto,
  titulo,
}: {
  acao?: string;
  children?: ReactNode;
  texto: string;
  titulo: string;
}) {
  return (
    <div className={cn(CARTAO, "grid justify-items-start gap-3 p-8")}>
      <h1 className="font-bold text-2xl text-titulo tracking-tight">
        {titulo}
      </h1>
      <p className="text-muted-foreground">{texto}</p>
      {children ?? (
        <Link className={BOTAO} href="/meus-cursos">
          <ArrowLeft aria-hidden="true" />
          {acao}
        </Link>
      )}
    </div>
  );
}
