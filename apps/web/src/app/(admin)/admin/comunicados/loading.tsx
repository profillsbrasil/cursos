import { Skeleton } from "@cursos/ui/components/skeleton";

import { EsqueletoDoCabecalho } from "@/components/casca/cabecalho-da-pagina";

const PULSO = "bg-card";

// O título, o cartão do formulário e o cartão da lista, enquanto o banco e o Clerk respondem.
export default function Carregando() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando</span>
      <EsqueletoDoCabecalho
        resumo="O aluno vê o mais recente em Meus cursos e todos em Comunicados"
        titulo="Comunicados"
      />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <Skeleton className={`${PULSO} h-[420px] rounded-[20px]`} />
        <div className="grid gap-px overflow-hidden rounded-[20px] ring-1 ring-border">
          {["a", "b", "c", "d"].map((linha) => (
            <Skeleton
              className={`${PULSO} h-[112px] rounded-none`}
              key={linha}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
