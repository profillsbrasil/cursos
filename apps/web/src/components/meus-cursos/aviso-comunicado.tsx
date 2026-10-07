import type { ComunicadoVM } from "@cursos/api/dominio/painel";
import { Megaphone } from "lucide-react";

import { fmtData } from "@/lib/formato";

// O comunicado mais recente visível, com o texto inteiro. Sem botão até a tela de comunicados existir.
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
