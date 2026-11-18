import type { ResumoAluno } from "@cursos/api/dominio/painel";
import {
  FIM_DE_SEMANA_NAO_QUEBRA,
  type StatusDia,
} from "@cursos/api/dominio/sequencia";
import { cn } from "@cursos/ui/lib/utils";
import { Check, Flame, Gift, Play, Star } from "lucide-react";
import Link from "next/link";

import { BOTAO_CONTORNO } from "@/components/casca/botoes";
import { CARTAO } from "@/components/casca/cartoes";
import { faltam, fmtPts, plural } from "@/lib/formato";

const DESCRICAO: Record<StatusDia, string> = {
  estudou: "estudou",
  fim_de_semana: "fim de semana, não conta",
  futuro: "ainda não chegou",
  hoje_estudou: "hoje, estudou",
  hoje_pendente: "hoje, ainda sem aula",
  nao_estudou: "não estudou",
};

// Marcador de cada dia. Hoje se marca pela sigla "Hoje" e, pendente, pela borda
// em titulo; feito, é o disco Sol dos outros dias estudados.
const MARCA: Record<StatusDia, string> = {
  estudou: "bg-sol text-sobre-cor",
  fim_de_semana:
    "border-[1.5px] border-muted-foreground border-dashed bg-popover after:h-0.5 after:w-2 after:rounded-full after:bg-muted-foreground",
  futuro: "ring-1 ring-muted-foreground ring-inset",
  hoje_estudou: "bg-sol text-sobre-cor",
  hoje_pendente: "ring-2 ring-titulo ring-inset",
  nao_estudou: "ring-2 ring-muted-foreground ring-inset",
};

const estudou = (s: StatusDia) => s === "estudou" || s === "hoje_estudou";
const ehHoje = (s: StatusDia) => s === "hoje_estudou" || s === "hoje_pendente";

// O card expõe o padding em --pad; cada divisória volta o padding com margem
// negativa, para a linha ir de uma borda à outra do card.
export function SuaSemana({
  resumo,
  temCursoTrocavelNaVitrine,
}: {
  resumo: ResumoAluno;
  temCursoTrocavelNaVitrine: boolean;
}) {
  const semSequencia = resumo.sequenciaDias === 0;

  // A chamada só aparece com um dia útil pendente hoje: no fim de semana a aula
  // não conta para a sequência, e a frase prometeria o que a regra não cumpre.
  const chamarParaHoje =
    semSequencia && resumo.dias.some((d) => d.status === "hoje_pendente");

  return (
    <aside
      aria-labelledby="semana-titulo"
      className={cn(
        CARTAO,
        "text-card-foreground grid max-w-3xl content-start gap-3.5 p-(--pad) [--pad:20px]"
      )}
    >
      <div className="flex items-center justify-between gap-2.5">
        <h2
          className="text-titulo text-lg leading-[1.3] font-bold tracking-tight"
          id="semana-titulo"
        >
          Sua semana
        </h2>
        {/* Zero não é conquista: sem sequência, a pílula some e a chamada vem abaixo dos dias. */}
        {semSequencia ? null : (
          <span className="bg-canela text-sobre-cor inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold tabular-nums">
            <Flame aria-hidden="true" className="size-[15px]" />
            {plural(resumo.sequenciaDias, "dia seguido", "dias seguidos")}
          </span>
        )}
      </div>
      <ul className="grid grid-cols-7 gap-1.5">
        {resumo.dias.map((d) => (
          <li
            className={cn(
              "text-muted-foreground grid justify-items-center gap-1.5 text-xs font-semibold",
              ehHoje(d.status) && "text-titulo"
            )}
            key={d.dia}
          >
            <span aria-hidden="true">
              {ehHoje(d.status) ? "Hoje" : d.sigla}
            </span>
            <span
              aria-label={`${d.nome}: ${DESCRICAO[d.status]}`}
              className={cn(
                "grid aspect-square w-[34px] max-w-full place-items-center rounded-full",
                MARCA[d.status]
              )}
              role="img"
            >
              {estudou(d.status) && (
                <Check
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2.6}
                />
              )}
            </span>
          </li>
        ))}
      </ul>
      {chamarParaHoje ? (
        <p className="text-foreground flex items-center gap-2 font-medium">
          <Play
            aria-hidden="true"
            className="text-ceu size-[15px] flex-none fill-current"
          />
          Assista a uma aula hoje para começar
        </p>
      ) : null}
      <p className="text-muted-foreground -mt-1 flex items-center gap-2 text-[13px]">
        <i
          aria-hidden="true"
          className="border-muted-foreground size-3.5 flex-none rounded-full border-[1.5px] border-dashed"
        />
        {FIM_DE_SEMANA_NAO_QUEBRA}
      </p>
      <p className="border-border -mx-(--pad) flex items-center gap-2.5 border-t px-(--pad) pt-3.5">
        <Star aria-hidden="true" className="text-sol size-5" />
        <span>
          {faltam(resumo.faltamParaBonus)}{" "}
          {plural(resumo.faltamParaBonus, "dia", "dias")} para{" "}
          <b className="text-sol font-semibold">+{fmtPts(resumo.bonus)}</b>
        </span>
      </p>
      <dl className="-mx-(--pad) grid">
        <div className="border-border flex items-baseline justify-between gap-3 border-t px-(--pad) py-2.5">
          <dt className="text-muted-foreground">Pontos na semana</dt>
          <dd className="text-titulo text-lg leading-[1.3] font-bold tabular-nums">
            {fmtPts(resumo.pontosSemana)}
          </dd>
        </div>
        <div
          className={cn(
            "border-border flex items-baseline justify-between gap-3 border-t px-(--pad) py-2.5",
            temCursoTrocavelNaVitrine && "border-b"
          )}
        >
          <dt className="text-muted-foreground">Seu saldo</dt>
          <dd className="text-sol text-lg leading-[1.3] font-bold tabular-nums">
            {fmtPts(resumo.saldo)}
          </dd>
        </div>
      </dl>
      {/* Sem curso trocável na vitrine, o botão levaria a uma vitrine vazia. */}
      {temCursoTrocavelNaVitrine ? (
        <Link className={cn(BOTAO_CONTORNO, "w-full")} href="/trocar-pontos">
          <Gift aria-hidden="true" />
          Trocar pontos
        </Link>
      ) : null}
    </aside>
  );
}
