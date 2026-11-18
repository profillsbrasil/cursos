import type { PaginaDoCurso } from "@cursos/api/dominio/pagina-do-curso";
import type { DiaISO } from "@cursos/api/dominio/tipos";
import { cn } from "@cursos/ui/lib/utils";
import { Check, Tag } from "lucide-react";

import { CARTAO } from "@/components/casca/cartoes";
import { SELO } from "@/components/casca/selos";
import { TextoQueAbre } from "@/components/casca/texto-que-abre";
import { CartaoDoCurso } from "./cartao-do-curso";
import { ConteudoDoCurso } from "./conteudo-do-curso";
import { paragrafos, resumoDoCurso } from "./textos";
import { TrocaDaAmostra } from "./troca-da-amostra";

export const GRADE_DO_CURSO =
  "grid items-start gap-x-9 gap-y-10 min-[1081px]:grid-cols-[minmax(0,1fr)_300px]";
export const LUGAR_DO_CARTAO =
  "min-[1081px]:sticky min-[1081px]:top-6 min-[1081px]:col-start-2 min-[1081px]:row-span-2 min-[1081px]:row-start-1";
export const LUGAR_DO_RESTO = "grid min-w-0 content-start gap-10";

// O "·" mora à esquerda de cada parte. A parte que abre uma linha o põe na margem negativa, que o overflow esconde.
const SEPARADO =
  "relative ml-7 before:absolute before:inset-y-0 before:-left-7 before:flex before:w-7 before:items-center before:justify-center before:content-['·']";

export function TelaDoCurso({
  hoje,
  pagina,
}: {
  hoje: DiaISO;
  pagina: PaginaDoCurso;
}) {
  const [lead, ...sobre] = paragrafos(pagina.descricao);
  const [primeira, ...resto] = resumoDoCurso(pagina);
  return (
    <div className={GRADE_DO_CURSO}>
      <header className="grid min-w-0 gap-3.5">
        <h1 className="text-titulo text-3xl leading-[1.2] font-bold tracking-tight text-balance">
          {pagina.titulo}
        </h1>
        {lead ? (
          <TextoQueAbre className="text-foreground text-base leading-[1.55] text-pretty">
            {lead}
          </TextoQueAbre>
        ) : null}
        <p className="text-muted-foreground overflow-hidden tabular-nums">
          <span className="-ml-7 flex flex-wrap items-center gap-y-2">
            <span className={cn(SEPARADO, "inline-flex items-center gap-3")}>
              <span
                className={cn(
                  SELO,
                  "text-foreground ring-muted-foreground bg-transparent font-medium ring-1 ring-inset"
                )}
              >
                <Tag aria-hidden="true" className="text-muted-foreground" />
                {pagina.categoria}
              </span>
              {primeira}
            </span>
            {resto.map((parte) => (
              <span className={SEPARADO} key={parte}>
                {parte}
              </span>
            ))}
          </span>
        </p>
      </header>
      {pagina.amostra ? (
        <TrocaDaAmostra
          amostra={pagina.amostra}
          className={LUGAR_DO_CARTAO}
          pagina={pagina}
        />
      ) : (
        <CartaoDoCurso
          className={LUGAR_DO_CARTAO}
          hoje={hoje}
          pagina={pagina}
        />
      )}
      <div className={LUGAR_DO_RESTO}>
        {pagina.topicos.length > 0 ? (
          <section
            aria-labelledby="o-que-voce-vai-aprender"
            className={cn(CARTAO, "px-[26px] py-6")}
          >
            <h2
              className="text-titulo mb-[18px] text-lg leading-[1.3] font-semibold"
              id="o-que-voce-vai-aprender"
            >
              O que você vai aprender
            </h2>
            <ul className="grid gap-x-7 gap-y-3.5 sm:grid-cols-2">
              {pagina.topicos.map((t) => (
                <li
                  className="grid grid-cols-[18px_minmax(0,1fr)] gap-2.5 text-pretty"
                  key={t}
                >
                  <Check
                    aria-hidden="true"
                    className="text-ceu mt-px size-[18px]"
                    strokeWidth={2.5}
                  />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <ConteudoDoCurso pagina={pagina} />
        {sobre.length > 0 ? (
          <section aria-labelledby="sobre-o-curso">
            <h2
              className="text-titulo mb-3.5 text-2xl leading-[1.33] font-bold tracking-tight"
              id="sobre-o-curso"
            >
              Sobre o curso
            </h2>
            <div className="grid gap-3 text-pretty">
              {sobre.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
