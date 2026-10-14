import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BOTAO } from "@/components/casca/botoes";

// Corpo dos not-found.tsx do app: diz o que faltou e leva de volta a Meus cursos.
export function TelaNaoEncontrada({
  texto,
  titulo,
}: {
  texto: string;
  titulo: string;
}) {
  return (
    <div className="grid justify-items-start gap-3 rounded-[20px] bg-card p-8 ring-1 ring-border">
      <h1 className="font-bold text-2xl text-titulo tracking-tight">
        {titulo}
      </h1>
      <p className="text-muted-foreground">{texto}</p>
      <Link className={BOTAO} href="/meus-cursos">
        <ArrowLeft aria-hidden="true" />
        Voltar para Meus cursos
      </Link>
    </div>
  );
}
