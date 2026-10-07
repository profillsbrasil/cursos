import type {
  CursoVM,
  PainelMeusCursos,
  ResumoAluno,
  TrilhaVM,
} from "@cursos/api/dominio/painel";

import { fmtHoras, fmtMin, plural } from "@/lib/formato";

import { AvisoComunicado } from "./aviso-comunicado";
import { BannerContinuar } from "./banner-continuar";
import { CapaCurso, type Etiqueta, sizesDaCapa } from "./capa-curso";
import { CartaoTrilha } from "./cartao-trilha";
import { PainelVazio } from "./painel-vazio";
import { Secao } from "./secao";
import { SuaSemana } from "./sua-semana";

const GRADE_TRILHAS =
  "grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-4";
const GRADE_CAPAS =
  "grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-x-[18px] gap-y-[22px]";

const duracao = (c: CursoVM): Etiqueta => ({
  texto: `${plural(c.aulas, "aula", "aulas")} · ${fmtHoras(c.duracaoSeg)}`,
  tipo: "duracao",
});

function CapasDaTrilha({ trilha }: { trilha: TrilhaVM }) {
  return (
    <Secao
      id={`trilha-${trilha.slug}`}
      subtitulo={trilha.descricao}
      titulo={trilha.titulo}
    >
      <div className={GRADE_CAPAS} data-bloco="capas">
        {trilha.cursos.map((c, _, todos) => {
          const m = c.primeiroModulo;
          const sizes = sizesDaCapa(todos.length);
          if (c.estado.tipo === "em_breve") {
            return (
              <CapaCurso
                curso={c}
                etiqueta={{ tipo: "em_breve" }}
                key={c.id}
                meta={`${m?.titulo ?? c.tema} · em produção`}
                sizes={sizes}
              />
            );
          }
          const comece = c.posicao === 1 && c.estado.tipo === "nao_iniciado";
          const resumoModulo = m
            ? `${m.titulo} · ${plural(m.aulas, "aula", "aulas")} · ${fmtMin(m.duracaoSeg)}`
            : c.tema;
          return (
            <CapaCurso
              curso={c}
              etiqueta={comece ? { tipo: "comece" } : duracao(c)}
              key={c.id}
              meta={resumoModulo}
              sizes={sizes}
            />
          );
        })}
      </div>
    </Secao>
  );
}

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
export function ConteudoMeusCursos({
  conta,
  painel,
  resumo,
}: {
  conta: string | null;
  painel: PainelMeusCursos;
  resumo: ResumoAluno;
}) {
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
  return (
    <>
      <Cabecalho painel={painel} />
      <div className="grid gap-10 max-[760px]:gap-8">
        <div className="grid items-stretch gap-5 min-[1181px]:grid-cols-[minmax(0,1fr)_320px]">
          <BannerContinuar retomada={painel.retomada} />
          <SuaSemana resumo={resumo} />
        </div>
        {painel.trilhas.length > 0 && (
          <Secao
            id="minhas-trilhas"
            subtitulo="Em ordem, sem prazo"
            titulo="Minhas trilhas"
          >
            <div className={GRADE_TRILHAS} data-bloco="trilhas">
              {painel.trilhas.map((t) => (
                <CartaoTrilha key={t.id} trilha={t} />
              ))}
            </div>
          </Secao>
        )}
        {painel.soltos.length > 0 && (
          <Secao
            id="cursos-rapidos"
            subtitulo="Liberados para você"
            titulo="Cursos rápidos"
          >
            <div className={GRADE_CAPAS} data-bloco="capas">
              {painel.soltos.map((c) => (
                <CapaCurso
                  curso={c}
                  etiqueta={duracao(c)}
                  key={c.id}
                  meta={c.extra ? `${c.tema} · ${c.extra}` : c.tema}
                  sizes={sizesDaCapa(painel.soltos.length)}
                />
              ))}
            </div>
          </Secao>
        )}
        {painel.trilhas
          .filter((t) => t.cursos.length >= 2)
          .map((t) => (
            <CapasDaTrilha key={t.id} trilha={t} />
          ))}
        {painel.comunicado ? (
          <AvisoComunicado comunicado={painel.comunicado} />
        ) : null}
      </div>
    </>
  );
}
