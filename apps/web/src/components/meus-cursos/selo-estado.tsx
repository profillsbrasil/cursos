import type { EstadoCurso } from "@cursos/api/dominio/tipos";
import { badgeVariants } from "@cursos/ui/components/badge";
import { cn } from "@cursos/ui/lib/utils";
import {
  BookOpen,
  Check,
  ClipboardCheck,
  Clock,
  Lock,
  type LucideIcon,
  Play,
} from "lucide-react";

interface Aparencia {
  classe: string;
  icone: LucideIcon;
  rotulo: string;
}

function aparencia(estado: EstadoCurso): Aparencia {
  switch (estado.tipo) {
    case "concluido":
      return {
        classe: "bg-ceu text-sobre-cor",
        icone: Check,
        rotulo: "Concluído",
      };
    case "em_andamento":
      return {
        classe: "bg-sol/14 text-sol",
        icone: Play,
        rotulo: "Em andamento",
      };
    case "prova":
      return {
        classe: "bg-canela text-sobre-cor",
        icone: ClipboardCheck,
        rotulo: "Falta a prova",
      };
    case "nao_iniciado":
      return {
        classe: "bg-popover text-foreground",
        icone: BookOpen,
        rotulo: "Não iniciado",
      };
    case "bloqueado":
      return {
        classe:
          "bg-transparent text-muted-foreground ring-1 ring-muted-foreground ring-inset",
        icone: Lock,
        rotulo: "Bloqueado",
      };
    case "em_breve":
      return {
        classe: "bg-transparent text-ceu ring-1 ring-ceu ring-inset",
        icone: Clock,
        rotulo: "Em breve",
      };
    default:
      return estado satisfies never;
  }
}

export function SeloEstado({ estado }: { estado: EstadoCurso }) {
  const { classe, icone: Icone, rotulo } = aparencia(estado);
  return (
    <span
      className={cn(
        badgeVariants({ variant: "secondary" }),
        "h-6 gap-1.5 rounded-full px-2.5 font-semibold text-xs",
        classe
      )}
    >
      <Icone aria-hidden="true" strokeWidth={2.4} />
      {rotulo}
    </span>
  );
}
