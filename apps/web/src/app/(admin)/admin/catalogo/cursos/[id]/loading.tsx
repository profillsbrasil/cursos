import { Skeleton } from "@cursos/ui/components/skeleton";

const PULSO = "bg-card motion-reduce:animate-none";

export default function Carregando() {
  return (
    <div aria-busy="true" className="grid gap-10">
      <span className="sr-only">Carregando</span>
      <div className="grid gap-3">
        <Skeleton className={`${PULSO} h-9 w-72 max-w-full rounded-lg`} />
        <Skeleton className={`${PULSO} h-5 w-44 rounded-full`} />
      </div>
      <Skeleton className={`${PULSO} h-[420px] rounded-[20px]`} />
      <Skeleton className={`${PULSO} h-[260px] rounded-[20px]`} />
      <Skeleton className={`${PULSO} h-[480px] rounded-[20px]`} />
    </div>
  );
}
