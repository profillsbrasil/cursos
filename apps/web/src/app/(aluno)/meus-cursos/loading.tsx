import { Skeleton } from "@cursos/ui/components/skeleton";

import {
  BuscaEmBreve,
  ChipsCarregando,
  TopoDoAluno,
} from "@/components/aluno/topo";

const PULSO = "bg-card motion-reduce:animate-none";

// Esqueleto no formato do banner, da semana, das trilhas e das capas.
export default function Carregando() {
  return (
    <>
      <TopoDoAluno chips={<ChipsCarregando />} esquerda={<BuscaEmBreve />} />
      <div aria-busy="true" className="grid gap-10">
        <span className="sr-only">Carregando seus cursos</span>
        <Skeleton className={`${PULSO} h-9 w-56 rounded-lg`} />
        <div className="grid gap-5 min-[1181px]:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className={`${PULSO} h-[360px] rounded-[20px]`} />
          <Skeleton className={`${PULSO} h-[360px] rounded-[20px]`} />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-4">
          <Skeleton className={`${PULSO} h-40 rounded-lg`} />
          <Skeleton className={`${PULSO} h-40 rounded-lg`} />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-x-[18px] gap-y-[22px]">
          <Skeleton className={`${PULSO} aspect-video rounded-lg`} />
          <Skeleton className={`${PULSO} aspect-video rounded-lg`} />
          <Skeleton className={`${PULSO} aspect-video rounded-lg`} />
        </div>
      </div>
    </>
  );
}
