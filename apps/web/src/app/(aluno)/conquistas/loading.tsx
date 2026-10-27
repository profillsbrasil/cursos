import { Skeleton } from "@cursos/ui/components/skeleton";

import {
  CabecalhoDasConquistas,
  DESTAQUE_DA_GRADE,
  GRADE_DAS_MEDALHAS,
} from "@/components/conquistas/tela-de-conquistas";

const PULSO = "bg-card";

export default function Carregando() {
  return (
    <>
      <CabecalhoDasConquistas contagem={null} />
      <div aria-busy="true" className="@container grid gap-10">
        <span className="sr-only">Carregando suas medalhas</span>
        <div className="grid gap-3.5">
          <Skeleton className={`${PULSO} h-[340px] rounded-[20px]`} />
          <Skeleton className={`${PULSO} h-[100px] rounded-[20px]`} />
          <Skeleton className={`${PULSO} h-[104px] rounded-[20px]`} />
          <div className={GRADE_DAS_MEDALHAS}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton
                className={`${PULSO} h-[172px] rounded-[20px] ${i === 0 ? DESTAQUE_DA_GRADE : ""}`}
                key={i}
              />
            ))}
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
