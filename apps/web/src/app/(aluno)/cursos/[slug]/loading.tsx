import { Skeleton } from "@cursos/ui/components/skeleton";

import {
  GRADE_DO_CURSO,
  LUGAR_DO_CARTAO,
  LUGAR_DO_RESTO,
} from "@/components/curso/tela-do-curso";

const PULSO = "bg-card";

export default function CarregandoCurso() {
  return (
    <div aria-busy="true" className={GRADE_DO_CURSO}>
      <div className="grid gap-3.5">
        <span className="sr-only">Carregando o curso</span>
        <Skeleton className={`${PULSO} h-9 w-2/3 rounded-lg`} />
        <Skeleton className={`${PULSO} h-[75px] max-w-[60ch] rounded-lg`} />
        <Skeleton className={`${PULSO} h-6 w-80 max-w-full rounded-full`} />
      </div>
      <Skeleton
        className={`${PULSO} ${LUGAR_DO_CARTAO} h-[560px] rounded-[20px]`}
      />
      <div className={LUGAR_DO_RESTO}>
        <Skeleton className={`${PULSO} h-[260px] rounded-[20px]`} />
        <div>
          <Skeleton className={`${PULSO} mb-3.5 h-8 w-60 rounded-lg`} />
          <Skeleton className={`${PULSO} h-[360px] rounded-[20px]`} />
        </div>
      </div>
    </div>
  );
}
