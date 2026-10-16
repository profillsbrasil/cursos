import { Skeleton } from "@cursos/ui/components/skeleton";

import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";
import { CabecalhoDasConquistas } from "@/components/conquistas/tela-de-conquistas";

const PULSO = "bg-card motion-reduce:animate-none";

export default function Carregando() {
  return (
    <>
      <TopoDoAluno esquerda={<BuscaEmBreve />} />
      <CabecalhoDasConquistas contagem={null} />
      <div aria-busy="true" className="grid gap-10">
        <span className="sr-only">Carregando suas medalhas</span>
        <div className="grid gap-3.5">
          <Skeleton className={`${PULSO} h-8 w-36 rounded-lg`} />
          <Skeleton className={`${PULSO} h-[600px] rounded-[20px]`} />
        </div>
        <div className="grid gap-3.5">
          <Skeleton className={`${PULSO} h-8 w-44 rounded-lg`} />
          <Skeleton className={`${PULSO} h-[256px] rounded-[20px]`} />
        </div>
      </div>
    </>
  );
}
