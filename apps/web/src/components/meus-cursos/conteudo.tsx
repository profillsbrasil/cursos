import type { PainelMeusCursos, ResumoAluno } from "@cursos/api/dominio/painel";

import { plural } from "@/lib/formato";

import { AvisoComunicado, FaixaComunicado } from "./aviso-comunicado";
import { BannerContinuar } from "./banner-continuar";
import {
  CapaCurso,
  etiquetaDeDuracao,
  GRADE_CAPAS,
  SIZES_DA_GRADE,
} from "./capa-curso";
import { PainelVazio } from "./painel-vazio";
import { Secao } from "./secao";
import { SuaSemana } from "./sua-semana";
import { Trilha } from "./trilha";

// Omite a parte que dá zero e concorda o participio: "1 trilha liberada para você".
function liberados({ soltos, trilhas }: PainelMeusCursos) {
  const partes = [
    trilhas.length > 0 && plural(trilhas.length, "trilha", "trilhas"),
    soltos.length > 0 &&
      plural(soltos.length, "curso rápido", "cursos rápidos"),
  ].filter((p) => p !== false);
  let participio = "liberados";
  if (soltos.length === 0) {
    participio = trilhas.length === 1 ? "liberada" : "liberadas";
  } else if (trilhas.length === 0 && soltos.length === 1) {
    participio = "liberado";
  }
  return `${partes.join(" e ")} ${participio} para você`;
}

function Cabecalho({ painel }: { painel: PainelMeusCursos }) {
  return (
    <header className="mb-7 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
      <h1 className="font-bold text-3xl text-titulo tracking-tight">
        Meus cursos
      </h1>
      <p className="text-muted-foreground">{liberados(painel)}</p>
    </header>
  );
}

// A página inteira a partir do painel e do resumo. A busca de dados fica na page.tsx.
// As trilhas vêm antes dos cursos rápidos: o conteúdo se organiza em trilhas, e o
// curso solto é a exceção.
export function ConteudoMeusCursos({
  conta,
  painel: doServidor,
  resumo,
  temCursoTrocavelNaVitrine,
}: {
  conta: string | null;
  painel: PainelMeusCursos;
  resumo: ResumoAluno;
  temCursoTrocavelNaVitrine: boolean;
}) {
  // A trilha sem curso saiu de uso: o admin tira os cursos dela para isso, porque
  // a trilha liberada não se apaga. Ela não aparece nem conta no cabeçalho.
  const painel = {
    ...doServidor,
    trilhas: doServidor.trilhas.filter((t) => t.cursos.length > 0),
  };
  if (painel.trilhas.length === 0 && painel.soltos.length === 0) {
    return (
      <>
        <h1 className="mb-7 font-bold text-3xl text-titulo tracking-tight">
          Meus cursos
        </h1>
        <PainelVazio conta={conta} />
      </>
    );
  }
  // O servidor decide o lugar: na faixa do topo enquanto é recente, no fim depois.
  const { comunicado } = painel;
  return (
    <>
      <Cabecalho painel={painel} />
      <div className="grid gap-10 max-[760px]:gap-8">
        <div className="grid gap-5">
          <div className="grid items-stretch gap-5 min-[1181px]:grid-cols-[minmax(0,1fr)_320px]">
            <BannerContinuar retomada={painel.retomada} />
            <SuaSemana
              resumo={resumo}
              temCursoTrocavelNaVitrine={temCursoTrocavelNaVitrine}
            />
          </div>
          {comunicado?.lugar === "topo" ? (
            <FaixaComunicado comunicado={comunicado} />
          ) : null}
        </div>
        {painel.trilhas.map((t) => (
          <Trilha key={t.id} trilha={t} />
        ))}
        {painel.soltos.length > 0 && (
          <Secao
            id="cursos-rapidos"
            subtitulo="Liberados para você"
            titulo="Cursos rápidos"
          >
            <div className={GRADE_CAPAS}>
              {painel.soltos.map((c) => (
                <CapaCurso
                  curso={c}
                  etiqueta={etiquetaDeDuracao(c)}
                  key={c.id}
                  meta={c.extra ? `${c.tema} · ${c.extra}` : c.tema}
                  sizes={SIZES_DA_GRADE}
                />
              ))}
            </div>
          </Secao>
        )}
        {comunicado?.lugar === "fim" ? (
          <AvisoComunicado comunicado={comunicado} />
        ) : null}
      </div>
    </>
  );
}
