import type { PaginaDoCurso } from "@cursos/api/dominio/pagina-do-curso";
import { Check, Tag } from "lucide-react";

import { CartaoDoCurso } from "./cartao-do-curso";
import { ConteudoDoCurso } from "./conteudo-do-curso";
import { paragrafos, resumoDoCurso } from "./textos";

/**
 * A grade da página e do esqueleto. A ordem no DOM é cabeçalho, cartão e resto:
 * abaixo de 1081 px, a mesma quebra da coluna do player, o cartão vem logo depois
 * do cabeçalho; acima, ele ocupa as duas linhas da coluna da direita, preso a 24 px.
 */
export const GRADE_DO_CURSO =
  "grid items-start gap-x-9 gap-y-10 min-[1081px]:grid-cols-[minmax(0,1fr)_300px]";
export const LUGAR_DO_CARTAO =
  "min-[1081px]:sticky min-[1081px]:top-6 min-[1081px]:col-start-2 min-[1081px]:row-span-2 min-[1081px]:row-start-1";
export const LUGAR_DO_RESTO = "grid min-w-0 content-start gap-10";

const SEPARADO = "before:mr-3 before:content-['·']";

export function TelaDoCurso({
  hoje,
  pagina,
}: {
  hoje: string;
  pagina: PaginaDoCurso;
}) {
  const [lead, ...sobre] = paragrafos(pagina.descricao);
  return (
    <div className={GRADE_DO_CURSO}>
      <header className="grid min-w-0 gap-3.5">
        <h1 className="text-balance font-bold text-3xl text-titulo leading-[1.2] tracking-tight">
          {pagina.titulo}
        </h1>
        {lead ? (
          <p className="max-w-[60ch] text-pretty text-base text-foreground leading-[1.55]">
            {lead}
          </p>
        ) : null}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground tabular-nums">
          <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 font-medium text-foreground text-xs ring-1 ring-trilho ring-inset">
            <Tag aria-hidden="true" className="size-3 text-muted-foreground" />
            {pagina.categoria}
          </span>
          {resumoDoCurso(pagina).map((parte, i) => (
            <span className={i > 0 ? SEPARADO : undefined} key={parte}>
              {parte}
            </span>
          ))}
        </p>
      </header>
      <CartaoDoCurso className={LUGAR_DO_CARTAO} hoje={hoje} pagina={pagina} />
      <div className={LUGAR_DO_RESTO}>
        {pagina.topicos.length > 0 ? (
          <section
            aria-labelledby="o-que-voce-vai-aprender"
            className="rounded-[20px] bg-card px-[26px] py-6 ring-1 ring-border"
          >
            <h2
              className="mb-[18px] font-semibold text-lg text-titulo leading-[1.3]"
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
                    className="mt-px size-[18px] text-ceu"
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
              className="mb-3.5 font-bold text-2xl text-titulo leading-[1.33] tracking-tight"
              id="sobre-o-curso"
            >
              Sobre o curso
            </h2>
            <div className="grid max-w-[64ch] gap-3 text-pretty">
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
