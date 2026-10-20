import { cn } from "@cursos/ui/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BOTAO } from "@/components/casca/botoes";
import { CARTAO } from "@/components/casca/cartoes";

// Corpo dos not-found.tsx do app: diz o que faltou e leva a Meus cursos.
export function TelaNaoEncontrada({
  acao = "Voltar para Meus cursos",
  texto,
  titulo,
}: {
  acao?: string;
  texto: string;
  titulo: string;
}) {
  return (
    <div className={cn(CARTAO, "grid justify-items-start gap-3 p-8")}>
      <h1 className="font-bold text-2xl text-titulo tracking-tight">
        {titulo}
      </h1>
      <p className="text-muted-foreground text-sm">{texto}</p>
      <Link className={BOTAO} href="/meus-cursos">
        <ArrowLeft aria-hidden="true" />
        {acao}
      </Link>
    </div>
  );
}
