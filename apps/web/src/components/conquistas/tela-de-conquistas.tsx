import type {
  CertificadoNaTela,
  Conquistas,
  Marco,
} from "@cursos/api/dominio/conquistas";
import { cn } from "@cursos/ui/lib/utils";
import {
  BookOpenCheck,
  Check,
  Flame,
  Gift,
  type LucideIcon,
  Play,
  Trophy,
} from "lucide-react";
import Image from "next/image";

import { Secao } from "@/components/meus-cursos/secao";
import { fmtNum } from "@/lib/formato";

import {
  contagemDasMedalhas,
  contagemDosCertificados,
  contagemDosMarcos,
  emitidoEm,
  ganhaEm,
  linhaDoCertificado,
  linhaDoMarco,
  type Progresso,
} from "./textos";

type Cor = "sol" | "ceu" | "canela";

const APARENCIA: Record<Marco["tipo"], { cor: Cor; icone: LucideIcon }> = {
  aulas: { cor: "ceu", icone: BookOpenCheck },
  primeira_aula: { cor: "sol", icone: Play },
  primeira_troca: { cor: "sol", icone: Gift },
  primeiro_curso: { cor: "ceu", icone: Trophy },
  sequencia: { cor: "canela", icone: Flame },
};

const DISCO: Record<Cor, string> = {
  canela:
    "bg-canela shadow-[0_0_0_3px_var(--card),0_0_0_4px_color-mix(in_srgb,var(--canela)_55%,transparent)]",
  ceu: "bg-ceu shadow-[0_0_0_3px_var(--card),0_0_0_4px_color-mix(in_srgb,var(--ceu)_55%,transparent)]",
  sol: "bg-sol shadow-[0_0_0_3px_var(--card),0_0_0_4px_color-mix(in_srgb,var(--sol)_55%,transparent)]",
};

function Medalha({ ganha, tipo }: { ganha: boolean; tipo: Marco["tipo"] }) {
  const { cor, icone: Icone } = APARENCIA[tipo];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-12 place-items-center rounded-full",
        ganha
          ? cn(DISCO[cor], "text-sobre-cor")
          : "border-[1.5px] border-muted-foreground border-dashed bg-popover text-muted-foreground"
      )}
      data-medalha={ganha ? "ganha" : "por_ganhar"}
    >
      <Icone className="size-5" strokeWidth={2.2} />
    </span>
  );
}

const SELO =
  "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 font-semibold text-xs";

function SeloGanho({ children }: { children: string }) {
  return (
    <span className={cn(SELO, "bg-ceu text-sobre-cor")}>
      <Check aria-hidden="true" className="size-3" strokeWidth={2.4} />
      {children}
    </span>
  );
}

function BarraDaMedalha({ feitas, total, unidade }: Progresso) {
  return (
    <span className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 text-muted-foreground text-xs tabular-nums">
      <span
        aria-hidden="true"
        className="h-1 overflow-hidden rounded-full bg-trilho ring-1 ring-muted-foreground ring-inset"
      >
        <span
          className="block h-full rounded-full bg-sol"
          style={{ width: `${Math.floor((feitas * 100) / total)}%` }}
        />
      </span>
      {fmtNum(feitas)} de {fmtNum(total)} {unidade}
    </span>
  );
}

const DICA = "text-[13px] text-muted-foreground text-pretty";

const LINHA =
  "grid grid-cols-[48px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3 p-4 @min-[600px]:grid-cols-[48px_minmax(0,1fr)_220px] @min-[600px]:gap-[18px] @min-[600px]:px-6 @min-[600px]:py-[18px]";
const LINHA_DO_CERTIFICADO =
  "grid-cols-[56px_minmax(0,1fr)] @min-[600px]:grid-cols-[72px_minmax(0,1fr)_220px]";
const ESTADO = "col-start-2 grid gap-1.5 @min-[600px]:col-start-3";
const LISTA =
  "rounded-[20px] bg-card ring-1 ring-border divide-y divide-border";
const NOME = "font-semibold text-base text-titulo leading-[1.4]";

function LinhaDoMarco({ hoje, marco }: { hoje: string; marco: Marco }) {
  const l = linhaDoMarco(marco);
  return (
    <li className={LINHA}>
      <Medalha ganha={l.estado === "ganha"} tipo={marco.tipo} />
      <div>
        <h3 className={NOME}>{l.nome}</h3>
        <p className={DICA}>{l.regra}</p>
      </div>
      {l.estado === "ganha" ? (
        <div className={cn(ESTADO, "justify-items-start")}>
          <SeloGanho>{ganhaEm(l.dia, hoje)}</SeloGanho>
          {l.fato ? <span className={DICA}>{l.fato}</span> : null}
        </div>
      ) : (
        <div className={ESTADO}>
          {l.progresso ? (
            <BarraDaMedalha {...l.progresso} />
          ) : (
            <span
              className={cn(
                SELO,
                "justify-self-start text-muted-foreground ring-1 ring-muted-foreground ring-inset"
              )}
            >
              Por ganhar
            </span>
          )}
          {l.proximoPasso ? (
            <span className={DICA}>{l.proximoPasso}</span>
          ) : null}
        </div>
      )}
    </li>
  );
}

function LinhaDoCertificado({
  certificado: c,
  hoje,
}: {
  certificado: CertificadoNaTela;
  hoje: string;
}) {
  return (
    <li className={cn(LINHA, LINHA_DO_CERTIFICADO)}>
      <span className="relative block aspect-[3/2] overflow-hidden rounded-[10px] bg-sidebar ring-1 ring-border">
        <Image
          alt=""
          className={cn(
            "object-cover",
            c.estado === "por_ganhar" && "brightness-70 grayscale-60"
          )}
          fill
          sizes="72px"
          src={c.curso.capa.url}
        />
      </span>
      <div>
        <h3 className={NOME}>{c.curso.titulo}</h3>
        <p className={DICA}>{linhaDoCertificado(c)}</p>
      </div>
      <div className={cn(ESTADO, "justify-items-start")}>
        {c.estado === "ganha" ? (
          <SeloGanho>{emitidoEm(c.dia, hoje)}</SeloGanho>
        ) : (
          <span className="w-full">
            <BarraDaMedalha feitas={c.feitas} total={c.total} unidade="aulas" />
          </span>
        )}
      </div>
    </li>
  );
}

export function CabecalhoDasConquistas({
  contagem,
}: {
  contagem: string | null;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
      <h1 className="font-bold text-3xl text-titulo tracking-tight">
        Conquistas
      </h1>
      {contagem ? (
        <p className="text-muted-foreground tabular-nums">{contagem}</p>
      ) : null}
    </header>
  );
}

export function TelaDeConquistas({ conquistas }: { conquistas: Conquistas }) {
  const { certificados, hoje, marcos } = conquistas;
  return (
    <>
      <CabecalhoDasConquistas contagem={contagemDasMedalhas(conquistas)} />
      <div className="@container grid gap-10">
        <Secao
          id="conquistas-marcos"
          subtitulo={contagemDosMarcos(marcos)}
          titulo="Marcos"
        >
          <ol className={LISTA}>
            {marcos.map((m) => (
              <LinhaDoMarco
                hoje={hoje}
                key={m.tipo === "aulas" ? `aulas-${m.meta}` : m.tipo}
                marco={m}
              />
            ))}
          </ol>
        </Secao>
        <Secao
          id="conquistas-certificados"
          subtitulo={
            certificados.length > 0
              ? contagemDosCertificados(certificados)
              : undefined
          }
          titulo="Certificados"
        >
          {certificados.length > 0 ? (
            <ol className={LISTA}>
              {certificados.map((c) => (
                <LinhaDoCertificado
                  certificado={c}
                  hoje={hoje}
                  key={c.curso.id}
                />
              ))}
            </ol>
          ) : (
            <p className="rounded-[20px] bg-card px-6 py-5 text-muted-foreground ring-1 ring-border">
              O certificado de cada curso liberado para você aparece aqui.
            </p>
          )}
        </Secao>
      </div>
    </>
  );
}
