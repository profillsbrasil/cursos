import { Skeleton } from "@cursos/ui/components/skeleton";

import { CabecalhoDaTroca } from "@/components/trocar-pontos/cabecalho-da-troca";

const PULSO = "bg-card";

export default function Carregando() {
  return (
    <>
      <CabecalhoDaTroca />
      <div aria-busy="true" className="grid gap-10">
        <span className="sr-only">Carregando seu saldo e os cursos</span>
        <Skeleton className={`${PULSO} h-[170px] rounded-[20px]`} />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-5">
          <Skeleton className={`${PULSO} h-[380px] rounded-[20px]`} />
          <Skeleton className={`${PULSO} h-[380px] rounded-[20px]`} />
          <Skeleton className={`${PULSO} h-[380px] rounded-[20px]`} />
        </div>
        <Skeleton className={`${PULSO} h-56 rounded-[20px]`} />
      </div>
    </>
  );
}
