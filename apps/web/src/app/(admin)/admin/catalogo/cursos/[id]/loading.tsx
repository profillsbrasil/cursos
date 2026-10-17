import { Skeleton } from "@cursos/ui/components/skeleton";

const PULSO = "bg-card motion-reduce:animate-none";

export default function Carregando() {
  return (
    <div aria-busy="true" className="@container">
      <span className="sr-only">Carregando</span>
      <div className="grid @min-[960px]:grid-cols-[minmax(0,1fr)_300px] items-start gap-8">
        <div className="grid gap-10">
          <div className="grid gap-3">
            <Skeleton className={`${PULSO} h-9 w-72 max-w-full rounded-lg`} />
            <Skeleton className={`${PULSO} h-5 w-44 rounded-full`} />
          </div>
          <Skeleton className={`${PULSO} h-[420px] rounded-[20px]`} />
          <Skeleton className={`${PULSO} h-[260px] rounded-[20px]`} />
          <Skeleton className={`${PULSO} h-[480px] rounded-[20px]`} />
        </div>
        <div className="grid @max-[960px]:hidden gap-3.5">
          <Skeleton className={`${PULSO} h-[260px] rounded-[20px]`} />
          <Skeleton className={`${PULSO} h-[230px] rounded-[20px]`} />
          <Skeleton className={`${PULSO} h-[240px] rounded-[20px]`} />
        </div>
      </div>
    </div>
  );
}
