import { Skeleton } from "@cursos/ui/components/skeleton";

import {
  BuscaEmBreve,
  ChipsCarregando,
  TopoDoAluno,
} from "@/components/aluno/topo";

const PULSO = "bg-card motion-reduce:animate-none";

// Esqueleto no formato do saldo, da grade de cursos e do extrato.
export default function Carregando() {
  return (
    <>
      <TopoDoAluno chips={<ChipsCarregando />} esquerda={<BuscaEmBreve />} />
      <div aria-busy="true" className="grid gap-10">
        <span className="sr-only">Carregando seu saldo e os cursos</span>
        <Skeleton className={`${PULSO} h-9 w-56 rounded-lg`} />
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
