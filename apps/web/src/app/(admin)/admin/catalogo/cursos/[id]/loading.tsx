import { Skeleton } from "@cursos/ui/components/skeleton";

const PULSO = "bg-card motion-reduce:animate-none";

export default function Carregando() {
  return (
    <div aria-busy="true" className="mx-auto grid max-w-5xl gap-10">
      <span className="sr-only">Carregando</span>
      <div className="grid gap-3">
        <Skeleton className={`${PULSO} h-5 w-24 rounded-full`} />
        <Skeleton className={`${PULSO} h-9 w-72 max-w-full rounded-lg`} />
      </div>
      <Skeleton className={`${PULSO} h-[420px] rounded-[20px]`} />
      <Skeleton className={`${PULSO} h-[260px] rounded-[20px]`} />
      <Skeleton className={`${PULSO} h-[480px] rounded-[20px]`} />
    </div>
  );
}
