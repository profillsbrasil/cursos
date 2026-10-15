import type { TrilhaVM } from "@cursos/api/dominio/painel";
import { cn } from "@cursos/ui/lib/utils";
import { Check, Clock, Play } from "lucide-react";
import Link from "next/link";

import { fmtMin, plural } from "@/lib/formato";

import { BarraProgresso } from "./barra-progresso";
import {
  CapaCurso,
  etiquetaDeDuracao,
  GRADE_CAPAS,
  SIZES_DA_GRADE,
} from "./capa-curso";
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

// O resumo é link para o curso da vez; sem curso da vez, não é link. Sem aria-label:
// o leitor lê o conteúdo (progresso, "Agora:" e o selo com o estado real).
function ResumoDaTrilha({ trilha }: { trilha: TrilhaVM }) {
  const conteudo = (
    <>
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
      {/* Divisória de borda a borda: margem negativa igual ao padding do cartão. */}
      <p className="-mx-(--pad) flex flex-wrap items-center gap-2 border-border border-t px-(--pad) pt-3 text-[13px] text-muted-foreground">
        <LinhaDaVez trilha={trilha} />
      </p>
    </>
  );
  if (!trilha.daVez) {
    return <div className={CARTAO}>{conteudo}</div>;
  }
  return (
    <Link
      className={cn(CARTAO, "transition-shadow hover:ring-ceu")}
      href={`/cursos/${trilha.daVez.slug}`}
    >
      {conteudo}
    </Link>
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
        <ol className={GRADE_CAPAS}>
          {trilha.cursos.map((c) => {
            const m = c.primeiroModulo;
            if (c.estado.tipo === "em_breve") {
              return (
                <li key={c.id}>
                  <CapaCurso
                    curso={c}
                    etiqueta={{ tipo: "em_producao" }}
                    meta={m?.titulo ?? c.tema}
                    ordem={c.posicao}
                    sizes={SIZES_DA_GRADE}
                  />
                </li>
              );
            }
            const comece = c.posicao === 1 && c.estado.tipo === "nao_iniciado";
            return (
              <li key={c.id}>
                <CapaCurso
                  curso={c}
                  etiqueta={comece ? { tipo: "comece" } : etiquetaDeDuracao(c)}
                  meta={
                    m
                      ? `${m.titulo} · ${plural(m.aulas, "aula", "aulas")} · ${fmtMin(m.duracaoSeg)}`
                      : c.tema
                  }
                  ordem={c.posicao}
                  sizes={SIZES_DA_GRADE}
                />
              </li>
            );
          })}
        </ol>
      </div>
    </Secao>
  );
}
