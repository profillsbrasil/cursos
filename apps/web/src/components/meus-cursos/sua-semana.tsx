import type { ResumoAluno } from "@cursos/api/dominio/painel";
import type { StatusDia } from "@cursos/api/dominio/sequencia";
import { cn } from "@cursos/ui/lib/utils";
import { Check, Flame, Gift, Play, Star } from "lucide-react";
import Link from "next/link";

import { BOTAO_CONTORNO } from "@/components/casca/botoes";
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
  return (
    <aside
      aria-labelledby="semana-titulo"
      className="grid content-start gap-3.5 rounded-[20px] bg-card p-(--pad) text-card-foreground ring-1 ring-border [--pad:20px]"
    >
      <div className="flex items-center justify-between gap-2.5">
        <h2
          className="font-bold text-lg text-titulo leading-[1.3] tracking-tight"
          id="semana-titulo"
        >
          Sua semana
        </h2>
        {/* Zero não é conquista: sem sequência, a pílula some e a chamada vem abaixo dos dias. */}
        {semSequencia ? null : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-canela px-3 py-1 font-semibold text-[13px] text-sobre-cor tabular-nums">
            <Flame aria-hidden="true" className="size-[15px]" />
            {plural(resumo.sequenciaDias, "dia seguido", "dias seguidos")}
          </span>
        )}
      </div>
      <ul className="grid grid-cols-7 gap-1.5">
        {resumo.dias.map((d) => (
          <li
            className={cn(
              "grid justify-items-center gap-1.5 font-semibold text-muted-foreground text-xs",
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
      {semSequencia ? (
        <p className="flex items-center gap-2 font-medium text-foreground text-sm">
          <Play
            aria-hidden="true"
            className="size-[15px] flex-none fill-current text-ceu"
          />
          Assista uma aula hoje para começar
        </p>
      ) : null}
      <p className="-mt-1 flex items-center gap-2 text-[13px] text-muted-foreground">
        <i
          aria-hidden="true"
          className="size-3.5 flex-none rounded-full border-[1.5px] border-muted-foreground border-dashed"
        />
        Fim de semana não quebra a sequência
      </p>
      <p className="-mx-(--pad) flex items-center gap-2.5 border-border border-t px-(--pad) pt-3.5 text-sm">
        <Star aria-hidden="true" className="size-5 text-sol" />
        <span>
          {faltam(resumo.faltamParaBonus)}{" "}
          {plural(resumo.faltamParaBonus, "dia", "dias")} para{" "}
          <b className="font-semibold text-sol">+{fmtPts(resumo.bonus)}</b>
        </span>
      </p>
      <dl className="-mx-(--pad) grid">
        <div className="flex items-baseline justify-between gap-3 border-border border-t px-(--pad) py-2.5">
          <dt className="text-muted-foreground text-sm">Pontos na semana</dt>
          <dd className="font-bold text-lg text-titulo tabular-nums leading-[1.3]">
            {fmtPts(resumo.pontosSemana)}
          </dd>
        </div>
        <div
          className={cn(
            "flex items-baseline justify-between gap-3 border-border border-t px-(--pad) py-2.5",
            temCursoTrocavelNaVitrine && "border-b"
          )}
        >
          <dt className="text-muted-foreground text-sm">Seu saldo</dt>
          <dd className="font-bold text-lg text-sol tabular-nums leading-[1.3]">
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
