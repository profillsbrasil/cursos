import { Skeleton } from "@cursos/ui/components/skeleton";

const PULSO = "bg-card motion-reduce:animate-none";

// O título e as seções de trilhas e de cursos, enquanto o banco responde.
export default function Carregando() {
  return (
    <div aria-busy="true" className="grid gap-7">
      <span className="sr-only">Carregando o catálogo</span>
      <Skeleton className={`${PULSO} h-9 w-56 rounded-lg`} />
      {["trilhas", "cursos"].map((secao) => (
        <div className="grid gap-4" key={secao}>
          <Skeleton className={`${PULSO} h-7 w-40 rounded-lg`} />
          <div className="grid gap-px overflow-hidden rounded-[20px] ring-1 ring-border">
            {["a", "b", "c"].map((linha) => (
              <Skeleton className={`${PULSO} h-14 rounded-none`} key={linha} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
