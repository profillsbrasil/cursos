import { Skeleton } from "@cursos/ui/components/skeleton";

import {
  LINHA_DO_MODULO,
  TITULO_DA_AULA,
} from "@/components/player/cabecalho-da-aula";

const PULSO = "bg-card";

export default function CarregandoAula() {
  return (
    <div
      aria-busy="true"
      className="grid items-start gap-6 min-[1081px]:grid-cols-[minmax(0,1fr)_360px]"
    >
      <span className="sr-only">Carregando a aula</span>
      <div className="grid gap-4">
        {/* Cada linha tem 1lh dentro da tipografia do cabeçalho real: o vídeo não pula quando a aula chega. */}
        <div>
          <div className={TITULO_DA_AULA}>
            <Skeleton className={`${PULSO} h-[1lh] w-2/3 rounded-lg`} />
          </div>
          <div className={LINHA_DO_MODULO}>
            <Skeleton className={`${PULSO} h-[1lh] w-1/2 rounded-md`} />
          </div>
        </div>
        <Skeleton className={`${PULSO} aspect-video rounded-[20px]`} />
      </div>
      <Skeleton className={`${PULSO} h-[420px] rounded-[20px]`} />
    </div>
  );
}
