import type { EstadoCurso } from "@cursos/api/dominio/tipos";
import { cn } from "@cursos/ui/lib/utils";
import {
  BookOpen,
  Check,
  Clock,
  ListChecks,
  type LucideIcon,
  Play,
} from "lucide-react";

import { SELO } from "@/components/casca/selos";

interface Aparencia {
  classe: string;
  icone: LucideIcon;
  rotulo: string;
}

function aparencia(estado: EstadoCurso) {
  switch (estado.tipo) {
    case "concluido": {
      const retorno: Aparencia = {
        classe: "bg-ceu text-sobre-cor",
        icone: Check,
        rotulo: "Concluído",
      };

      return retorno;
    }

    case "em_andamento": {
      const retorno: Aparencia = {
        classe: "bg-sol/14 text-sol",
        icone: Play,
        rotulo: "Em andamento",
      };

      return retorno;
    }

    case "questionarios": {
      const retorno: Aparencia = {
        classe: "bg-canela text-sobre-cor",
        icone: ListChecks,
        rotulo: "Faltam questionários",
      };

      return retorno;
    }

    case "nao_iniciado": {
      const retorno: Aparencia = {
        classe: "bg-popover text-foreground",
        icone: BookOpen,
        rotulo: "Não iniciado",
      };

      return retorno;
    }

    case "em_breve": {
      const retorno: Aparencia = {
        classe: "bg-transparent text-ceu ring-1 ring-ceu ring-inset",
        icone: Clock,
        rotulo: "Em produção",
      };

      return retorno;
    }

    default: {
      const retorno: Aparencia = estado satisfies never;

      return retorno;
    }
  }
}

export function SeloEstado({ estado }: { estado: EstadoCurso }) {
  const { classe, icone: Icone, rotulo } = aparencia(estado);

  return (
    <span className={cn(SELO, classe)}>
      <Icone aria-hidden="true" strokeWidth={2.4} />
      {rotulo}
    </span>
  );
}
