import type { ResumoAluno } from "@cursos/api/dominio/painel";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@cursos/ui/components/input-group";
import { SidebarTrigger } from "@cursos/ui/components/sidebar";
import { Flame, Search, Star } from "lucide-react";

import { fmtPts, plural } from "@/lib/formato";

const CHIP =
  "inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm tabular-nums";

export function Topo({ resumo }: { resumo: ResumoAluno }) {
  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-[1_1_280px] items-center gap-2">
        <SidebarTrigger
          aria-label="Abrir navegação"
          className="size-9 rounded-full md:hidden"
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
      <div className="ml-auto flex gap-2">
        <span className={CHIP} title="Sequência de dias úteis de estudo">
          <Flame aria-hidden="true" className="size-4 text-canela" />
          <b className="font-semibold">
            {plural(resumo.sequenciaDias, "dia", "dias")}
          </b>
        </span>
        <span
          className={`${CHIP} text-sol`}
          title="Saldo de pontos para trocar por cursos"
        >
          <Star aria-hidden="true" className="size-4" />
          <b className="font-semibold">{fmtPts(resumo.saldo)}</b>
        </span>
      </div>
    </div>
  );
}
