import type { ComunicadoVM } from "@cursos/api/dominio/painel";
import { ChevronDown, Megaphone } from "lucide-react";

import { fmtData, fmtDiaCurto } from "@/lib/formato";

// O comunicado recente (`lugar: "topo"`): uma linha com o título e a data, entre
// Sua semana e as trilhas. O texto abre por baixo, no `details`, sem JavaScript.
export function FaixaComunicado({ comunicado }: { comunicado: ComunicadoVM }) {
  return (
    <details className="group rounded-[14px] bg-card text-card-foreground ring-1 ring-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-[14px] px-4 py-2.5 transition-colors duration-150 hover:bg-white/8 group-open:rounded-b-none motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
        <Megaphone aria-hidden="true" className="size-4 shrink-0 text-ceu" />
        <span className="min-w-0 flex-1 truncate font-semibold text-sm text-titulo">
          <span className="sr-only">Comunicado: </span>
          {comunicado.titulo}
        </span>
        <time
          className="shrink-0 text-muted-foreground text-sm"
          dateTime={comunicado.publicadoEm}
        >
          {fmtDiaCurto(comunicado.publicadoEm)}
        </time>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-forte group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <p className="pt-1 pr-4 pb-3 pl-11 text-muted-foreground text-sm">
        {comunicado.texto} Publicado em {fmtData(comunicado.publicadoEm)}.
      </p>
    </details>
  );
}

// O comunicado que passou do topo (`lugar: "fim"`), com o texto inteiro, depois
// dos cursos rápidos. Sem botão até a tela de comunicados existir.
export function AvisoComunicado({ comunicado }: { comunicado: ComunicadoVM }) {
  return (
    <section
      aria-labelledby="aviso-titulo"
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-[20px] bg-card px-[22px] py-[18px] text-card-foreground ring-1 ring-border max-[760px]:p-4"
    >
      <span className="grid size-11 place-items-center rounded-full bg-ceu text-sobre-cor">
        <Megaphone aria-hidden="true" className="size-5" />
      </span>
      <div>
        <h2 className="font-semibold text-base text-titulo" id="aviso-titulo">
          {comunicado.titulo}
        </h2>
        <p className="mt-1 text-muted-foreground text-sm">
          {comunicado.texto} Publicado em {fmtData(comunicado.publicadoEm)}.
        </p>
      </div>
    </section>
  );
}
