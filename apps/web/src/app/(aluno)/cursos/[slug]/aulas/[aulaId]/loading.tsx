import { Skeleton } from "@cursos/ui/components/skeleton";

import { TopoDoAluno } from "@/components/aluno/topo";

const PULSO = "bg-card motion-reduce:animate-none";

export default function CarregandoAula() {
  return (
    <>
      <TopoDoAluno
        esquerda={<Skeleton className={`${PULSO} h-5 w-64 rounded-md`} />}
      />
      <div
        aria-busy="true"
        className="grid items-start gap-6 min-[1081px]:grid-cols-[minmax(0,1fr)_360px]"
      >
        <span className="sr-only">Carregando a aula</span>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Skeleton className={`${PULSO} h-9 w-2/3 rounded-lg`} />
            <Skeleton className={`${PULSO} h-5 w-1/2 rounded-md`} />
          </div>
          <Skeleton className={`${PULSO} aspect-video rounded-[20px]`} />
        </div>
        <Skeleton className={`${PULSO} h-[420px] rounded-[20px]`} />
      </div>
    </>
  );
}
