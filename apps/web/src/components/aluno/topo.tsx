import type { ResumoAluno } from "@cursos/api/dominio/painel";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@cursos/ui/components/input-group";
import { SidebarTrigger } from "@cursos/ui/components/sidebar";
import { Skeleton } from "@cursos/ui/components/skeleton";
import { Flame, Search, Star } from "lucide-react";
import type { ReactNode } from "react";

import { fmtPts, plural } from "@/lib/formato";

const CHIP =
  "inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm tabular-nums";

/**
 * O gatilho da sidebar e a busca não dependem do banco. Só `chips` suspende: assim o
 * React não troca o gatilho por outro nó quando o resumo chega, e o foco não se perde.
 */
export function Topo({ chips }: { chips: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-[1_1_280px] items-center gap-2">
        {/* Visível em toda largura: Ctrl+B ou Cmd+B fecha a sidebar no desktop e grava o
            cookie por 7 dias, então a pessoa precisa de um botão para trazê-la de volta. */}
        <SidebarTrigger
          aria-label="Mostrar ou esconder a navegação"
          className="size-9 rounded-full"
        />
        <InputGroup className="h-10 max-w-[460px] flex-1 rounded-full border-input bg-card px-2 has-disabled:opacity-100 dark:bg-card">
          <InputGroupAddon>
            <Search aria-hidden="true" className="text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Buscar aula, máquina ou tema (em breve)"
            className="text-sm placeholder:text-muted-foreground disabled:opacity-100"
            disabled
            placeholder="Busca em breve"
            type="search"
          />
        </InputGroup>
      </div>
      {chips}
    </div>
  );
}

/** Esqueleto com a mesma altura e o mesmo contêiner dos chips, enquanto o resumo carrega. */
export function ChipsCarregando() {
  return (
    <div aria-hidden="true" className="ml-auto flex gap-2">
      <Skeleton className="h-9 w-20 rounded-full bg-card motion-reduce:animate-none" />
      <Skeleton className="h-9 w-24 rounded-full bg-card motion-reduce:animate-none" />
    </div>
  );
}

// O significado de cada chip vai em texto sr-only, não em title: title não chega ao
// teclado nem ao toque, e o leitor de tela nem sempre o lê.
export function Chips({ resumo }: { resumo: ResumoAluno }) {
  return (
    <div className="ml-auto flex gap-2">
      <span className={CHIP}>
        <Flame aria-hidden="true" className="size-4 text-canela" />
        <span className="sr-only">Sequência de dias úteis de estudo:</span>
        <b className="font-semibold">
          {plural(resumo.sequenciaDias, "dia", "dias")}
        </b>
      </span>
      <span className={`${CHIP} text-sol`}>
        <Star aria-hidden="true" className="size-4" />
        <span className="sr-only">Saldo de pontos para trocar por cursos:</span>
        <b className="font-semibold">{fmtPts(resumo.saldo)}</b>
      </span>
    </div>
  );
}
