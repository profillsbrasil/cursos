import { Skeleton } from "@cursos/ui/components/skeleton";

import {
  BAIXO_DA_TRILHA,
  CabecalhoDasConquistas,
} from "@/components/conquistas/tela-de-conquistas";

const PULSO = "bg-card motion-reduce:animate-none";

export default function Carregando() {
  return (
    <>
      <CabecalhoDasConquistas contagem={null} />
      <div aria-busy="true" className="@container grid gap-10">
        <span className="sr-only">Carregando suas medalhas</span>
        <div className="grid gap-3.5">
          <Skeleton className={`${PULSO} h-8 w-36 rounded-lg`} />
          <Skeleton className={`${PULSO} h-[268px] rounded-[20px]`} />
          <div className={BAIXO_DA_TRILHA}>
            <Skeleton className={`${PULSO} h-[240px] rounded-[20px]`} />
            <Skeleton className={`${PULSO} h-[240px] rounded-[20px]`} />
          </div>
        </div>
        <div className="grid gap-3.5">
          <Skeleton className={`${PULSO} h-8 w-44 rounded-lg`} />
          <div className="grid @min-[600px]:grid-cols-4 grid-cols-1 gap-3.5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton
                className={`${PULSO} aspect-[3/4] rounded-[20px]`}
                key={i}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
