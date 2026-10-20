import { Skeleton } from "@cursos/ui/components/skeleton";

import { EsqueletoDoCabecalho } from "@/components/casca/cabecalho-da-pagina";

const PULSO = "bg-card";

export default function Carregando() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando as categorias</span>
      <EsqueletoDoCabecalho />
      <div className="grid gap-8">
        <Skeleton className={`${PULSO} h-[72px] rounded-[20px]`} />
        <div className="grid gap-3.5">
          <Skeleton className={`${PULSO} h-8 w-32 rounded-lg`} />
          <div className="grid gap-px overflow-hidden rounded-[20px] ring-1 ring-border">
            {["a", "b", "c", "d"].map((linha) => (
              <Skeleton
                className={`${PULSO} h-[76px] rounded-none`}
                key={linha}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
