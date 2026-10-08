import { Skeleton } from "@cursos/ui/components/skeleton";

const PULSO = "bg-card motion-reduce:animate-none";

// Serve à busca e ao acesso da pessoa: o título e um cartão de linhas, enquanto
// o Clerk e o banco respondem.
export default function Carregando() {
  return (
    <div aria-busy="true" className="grid gap-7">
      <span className="sr-only">Carregando</span>
      <Skeleton className={`${PULSO} h-9 w-56 rounded-lg`} />
      <Skeleton className={`${PULSO} h-11 w-full rounded-full`} />
      <div className="grid gap-px overflow-hidden rounded-[20px] ring-1 ring-border">
        {["a", "b", "c", "d", "e"].map((linha) => (
          <Skeleton className={`${PULSO} h-[68px] rounded-none`} key={linha} />
        ))}
      </div>
    </div>
  );
}
