import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import { VideoOff } from "lucide-react";

import {
  CabecalhoDaAula,
  DescricaoDaAula,
  NavegacaoEntreAulas,
} from "./cabecalho-da-aula";

export function AulaSemVideo({ dados }: { dados: AulaNoPlayer }) {
  return (
    <div className="grid min-w-0 gap-4">
      <CabecalhoDaAula dados={dados} />
      <div className="grid aspect-video min-h-[200px] place-items-center rounded-[20px] border border-border bg-background p-6 text-center">
        <div className="grid justify-items-center gap-3">
          <VideoOff
            aria-hidden="true"
            className="size-8 text-muted-foreground"
          />
          <p className="max-w-[40ch] text-muted-foreground">
            O vídeo desta aula ainda não foi publicado.
          </p>
        </div>
      </div>
      <NavegacaoEntreAulas
        dados={dados}
        destacarProxima={dados.estudo.assistida}
      />
      <DescricaoDaAula dados={dados} />
    </div>
  );
}
