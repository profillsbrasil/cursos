import { Skeleton } from "@cursos/ui/components/skeleton";

import { ChipsCarregando, TopoDoAluno } from "@/components/aluno/topo";

const PULSO = "bg-card motion-reduce:animate-none";

export default function CarregandoAula() {
  return (
    <>
      <TopoDoAluno
        chips={<ChipsCarregando />}
        esquerda={<Skeleton className={`${PULSO} h-5 w-64 rounded-md`} />}
      />
      <div
        aria-busy="true"
        className="grid items-start gap-6 min-[1081px]:grid-cols-[minmax(0,1fr)_360px]"
      >
        <span className="sr-only">Carregando a aula</span>
        <div className="grid gap-5">
          <Skeleton className={`${PULSO} aspect-video rounded-[20px]`} />
          <Skeleton className={`${PULSO} h-9 w-2/3 rounded-lg`} />
        </div>
        <Skeleton className={`${PULSO} h-[420px] rounded-[20px]`} />
      </div>
    </>
  );
}
