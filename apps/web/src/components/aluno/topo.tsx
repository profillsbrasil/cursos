import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@cursos/ui/components/input-group";
import { Search } from "lucide-react";
import type { ReactNode } from "react";

/**
 * O topo de cada página do aluno. `esquerda`: a busca. `direita`: o canto
 * livre que cada página usa como quiser. A navegação e o placar moram na sidebar.
 */
export function TopoDoAluno({
  direita,
  esquerda,
}: {
  direita?: ReactNode;
  esquerda: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-[1_1_280px] items-center gap-2">
        {esquerda}
      </div>
      {direita}
    </div>
  );
}

export function BuscaEmBreve() {
  return (
    <InputGroup className="h-11 max-w-[460px] flex-1 rounded-full border-input bg-background px-2 has-disabled:opacity-100 dark:bg-background">
      <InputGroupAddon>
        <Search aria-hidden="true" className="text-muted-foreground" />
      </InputGroupAddon>
      <InputGroupInput
        aria-label="Buscar aula, máquina ou categoria (em breve)"
        className="text-sm placeholder:text-muted-foreground disabled:opacity-100"
        disabled
        placeholder="Busca em breve"
        type="search"
      />
    </InputGroup>
  );
}
