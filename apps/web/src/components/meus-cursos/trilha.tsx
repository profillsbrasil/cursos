import type { TrilhaVM } from "@cursos/api/dominio/painel";
import { Check, Clock, Play } from "lucide-react";

import { BarraProgresso } from "./barra-progresso";
import { CapaCurso, GRADE_CAPAS, SIZES_DA_GRADE } from "./capa-curso";
import { Secao } from "./secao";
import { SeloEstado } from "./selo-estado";

const CARTAO =
  "grid gap-3 rounded-lg bg-card p-(--pad) text-card-foreground ring-1 ring-border [--pad:16px]";

function LinhaDaVez({ trilha }: { trilha: TrilhaVM }) {
  const { daVez } = trilha;
  if (daVez) {
    return (
      <>
        <Play
          aria-hidden="true"
          className="size-[15px] fill-current text-ceu"
        />
        Agora: <b className="font-semibold text-foreground">{daVez.titulo}</b>
        {daVez.temNiveis && daVez.moduloAtual
          ? ` · Módulo ${daVez.moduloAtual.numero}`
          : null}
        <SeloEstado estado={daVez.estado} />
      </>
    );
  }
  if (trilha.situacao === "concluida") {
    return (
      <>
        <Check aria-hidden="true" className="size-[15px] text-ceu" />
        Trilha concluída
      </>
    );
  }
  return (
    <>
      <Clock aria-hidden="true" className="size-[15px] text-ceu" />
      Os próximos cursos estão em produção
    </>
  );
}

// O resumo não é link: a capa do curso da vez, logo abaixo, já é. Na trilha de um
// curso só, a linha "Agora:" repetiria o título e o selo da única capa, e sai.
function ResumoDaTrilha({ trilha }: { trilha: TrilhaVM }) {
  const repeteACapa = trilha.daVez !== null && trilha.cursos.length === 1;
  return (
    <div className={CARTAO}>
      <div className="grid gap-2">
        <p className="flex justify-between gap-2 text-[13px] text-muted-foreground tabular-nums">
          <span>
            <b className="font-semibold text-foreground">
              {trilha.concluidos} de {trilha.cursos.length}
            </b>{" "}
            {trilha.cursos.length === 1 ? "curso" : "cursos"}
          </span>
          <span>{trilha.aulas.pct}% das aulas</span>
        </p>
        <BarraProgresso
          pct={trilha.aulas.pct}
          rotulo={`Aulas assistidas na trilha ${trilha.titulo}`}
        />
      </div>
      {repeteACapa ? null : (
        // Divisória de borda a borda: margem negativa igual ao padding do cartão.
        <p className="-mx-(--pad) flex flex-wrap items-center gap-2 border-border border-t px-(--pad) pt-3 text-[13px] text-muted-foreground">
          <LinhaDaVez trilha={trilha} />
        </p>
      )}
    </div>
  );
}

// A trilha inteira num bloco: o título uma vez, o resumo e as capas na ordem da
// trilha, numeradas, porque o curso seguinte só abre com o anterior concluído.
export function Trilha({ trilha }: { trilha: TrilhaVM }) {
  return (
    <Secao
      id={`trilha-${trilha.slug}`}
      subtitulo={trilha.descricao}
      titulo={trilha.titulo}
    >
      <div className="grid gap-5">
        <ResumoDaTrilha trilha={trilha} />
        {/* biome-ignore lint/a11y/noRedundantRoles: o WebKit tira o papel de lista do `ol` sem marcador, e o VoiceOver não diz "lista". */}
        <ol className={GRADE_CAPAS} role="list">
          {trilha.cursos.map((c) => (
            <li key={c.id}>
              <CapaCurso
                comece={c.posicao === 1 && c.estado.tipo === "nao_iniciado"}
                curso={c}
                ordem={c.posicao}
                sizes={SIZES_DA_GRADE}
              />
            </li>
          ))}
        </ol>
      </div>
    </Secao>
  );
}
