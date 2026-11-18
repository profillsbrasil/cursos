import type { ComunicadoVM } from "@cursos/api/dominio/painel";
import { cn } from "@cursos/ui/lib/utils";
import { ChevronDown, Megaphone } from "lucide-react";

import { CARTAO } from "@/components/casca/cartoes";
import { diaCurto, diaEmSaoPaulo, fmtData } from "@/lib/formato";

// O comunicado recente (`lugar: "topo"`): uma linha com o título e a data, no
// topo de Meus cursos. O texto abre por baixo, no `details`, sem JavaScript.
export function FaixaComunicado({
  className,
  comunicado,
}: {
  className?: string;
  comunicado: ComunicadoVM;
}) {
  return (
    <details
      className={cn(
        "group bg-card text-card-foreground ring-border min-w-0 rounded-[14px] ring-1",
        className
      )}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-[14px] px-4 py-2.5 transition-colors duration-150 group-open:rounded-b-none hover:bg-white/8 [&::-webkit-details-marker]:hidden">
        <Megaphone aria-hidden="true" className="text-ceu size-4 shrink-0" />
        {/* Fechada, o título corta em uma linha; aberta, ele quebra e aparece inteiro.
            O h2 dentro do summary deixa o comunicado na navegação por títulos. */}
        <h2 className="text-titulo min-w-0 flex-1 truncate text-sm font-semibold group-open:whitespace-normal">
          <span className="sr-only">Comunicado: </span>
          {comunicado.titulo}
        </h2>
        <time
          className="text-muted-foreground shrink-0 text-sm"
          dateTime={comunicado.publicadoEm}
        >
          {diaCurto(diaEmSaoPaulo(comunicado.publicadoEm), comunicado.hoje)}
        </time>
        <ChevronDown
          aria-hidden="true"
          className="text-muted-foreground ease-forte size-4 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <p className="text-muted-foreground pt-1 pr-4 pb-3 pl-11 text-sm">
        {comunicado.texto} Publicado em {fmtData(comunicado.publicadoEm)}.
      </p>
    </details>
  );
}

// O comunicado que passou do topo (`lugar: "fim"`), com o texto inteiro, depois
// dos cursos. Ainda sem link para a tela Comunicados.
export function AvisoComunicado({ comunicado }: { comunicado: ComunicadoVM }) {
  return (
    <section
      aria-labelledby="aviso-titulo"
      className={cn(
        CARTAO,
        "text-card-foreground grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 px-[22px] py-[18px] max-[760px]:p-4"
      )}
    >
      <span className="bg-ceu text-sobre-cor grid size-11 place-items-center rounded-full">
        <Megaphone aria-hidden="true" className="size-5" />
      </span>
      <div>
        <h2 className="text-titulo text-base font-semibold" id="aviso-titulo">
          {comunicado.titulo}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {comunicado.texto} Publicado em {fmtData(comunicado.publicadoEm)}.
        </p>
      </div>
    </section>
  );
}
