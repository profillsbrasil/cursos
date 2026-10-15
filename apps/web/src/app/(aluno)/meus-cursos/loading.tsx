import { Skeleton } from "@cursos/ui/components/skeleton";

import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";
import { GRADE_CAPAS } from "@/components/meus-cursos/capa-curso";

const PULSO = "bg-card motion-reduce:animate-none";

// Esqueleto no formato do banner, da semana e da primeira trilha: o título, o
// resumo de largura cheia e as capas na mesma grade da página.
export default function Carregando() {
  return (
    <>
      <TopoDoAluno esquerda={<BuscaEmBreve />} />
      <div aria-busy="true" className="grid gap-10">
        <span className="sr-only">Carregando seus cursos</span>
        <Skeleton className={`${PULSO} h-9 w-56 rounded-lg`} />
        <div className="grid gap-5 min-[1181px]:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className={`${PULSO} h-[360px] rounded-[20px]`} />
          <Skeleton className={`${PULSO} h-[360px] rounded-[20px]`} />
        </div>
        <div>
          <Skeleton className={`${PULSO} mb-4 h-7 w-52 rounded-lg`} />
          <div className="grid gap-5">
            <Skeleton
              className={`${PULSO} h-[116px] rounded-lg`}
              data-esqueleto="resumo-da-trilha"
            />
            <div className={GRADE_CAPAS}>
              <Skeleton className={`${PULSO} aspect-video rounded-lg`} />
              <Skeleton className={`${PULSO} aspect-video rounded-lg`} />
              <Skeleton className={`${PULSO} aspect-video rounded-lg`} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
