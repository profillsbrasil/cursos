import type {
  CertificadoNaTela,
  Conquistas,
  Marco,
} from "@cursos/api/dominio/conquistas";
import type { DiaISO } from "@cursos/api/dominio/tipos";
import { cn } from "@cursos/ui/lib/utils";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  Check,
  Flame,
  Gift,
  type LucideIcon,
  Play,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { Secao } from "@/components/meus-cursos/secao";
import { diaCurto, fmtNum, plural } from "@/lib/formato";
import { caminhoDoCertificado, caminhoDoCurso } from "@/lib/rotas";

import { diasDaSequencia } from "./dias-da-sequencia";
import { colunasDosCertificados, cssDoPonto, pontoNaTrilha } from "./geometria";
import {
  contagemDasMedalhas,
  contagemDosCertificados,
  contagemDosMarcos,
  ehPrimeiraVez,
  emitidoEm,
  fraseDaSequencia,
  ganhaEm,
  legendaDoDegrau,
  linhaDaPrimeiraVez,
  type MarcoDo,
  porcentagem,
  rotuloDoDia,
  siglaDoDia,
  tituloDaTrilha,
  trilhaDeAulas,
} from "./textos";

type Cor = "sol" | "ceu" | "canela";
type Figura = Marco["tipo"] | "certificado";

const APARENCIA: Record<Figura, { cor: Cor; icone: LucideIcon }> = {
  aulas: { cor: "ceu", icone: BookOpenCheck },
  certificado: { cor: "sol", icone: Award },
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

const TAMANHO = {
  40: { disco: "size-10", icone: "size-[18px]" },
  56: { disco: "size-14", icone: "size-6" },
} as const;

function Medalha({
  className,
  figura,
  ganha,
  tamanho,
}: {
  className?: string;
  figura: Figura;
  ganha: boolean;
  tamanho: keyof typeof TAMANHO;
}) {
  const { cor, icone: Icone } = APARENCIA[figura];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid flex-none place-items-center rounded-full",
        TAMANHO[tamanho].disco,
        ganha
          ? cn(DISCO[cor], "text-sobre-cor")
          : "border-[1.5px] border-muted-foreground border-dashed bg-popover text-muted-foreground",
        className
      )}
      data-medalha={ganha ? "ganha" : "por_ganhar"}
    >
      <Icone className={TAMANHO[tamanho].icone} strokeWidth={2.2} />
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

function Trilho({
  className,
  largura,
}: {
  className?: string;
  largura: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block overflow-hidden rounded-full bg-trilho ring-1 ring-muted-foreground ring-inset",
        className
      )}
    >
      <span
        className="block h-full rounded-full bg-sol"
        style={{ width: largura }}
      />
    </span>
  );
}

const DICA = "text-[13px] text-muted-foreground text-pretty";
const CARTAO = "rounded-[20px] bg-card ring-1 ring-border";
const TITULO_DO_CARTAO = "font-semibold text-lg text-titulo leading-[1.3]";

function TrilhaDeAulas({
  hoje,
  marcos,
}: {
  hoje: string;
  marcos: readonly Marco[];
}) {
  const { degraus, feitas } = trilhaDeAulas(marcos);
  const [verso, segundoVerso] = tituloDaTrilha(feitas, degraus);
  const ponto = cssDoPonto(
    pontoNaTrilha(
      feitas,
      degraus.map((d) => d.meta)
    )
  );
  return (
    <div
      className={cn(CARTAO, "grid gap-7 p-[clamp(22px,3.4vw,36px)]")}
      data-trilha
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h3 className="text-balance font-bold text-[clamp(24px,2.6vw,32px)] text-titulo leading-[1.15] tracking-tight">
          {verso}
          <span className="block text-sol">{segundoVerso}</span>
        </h3>
        <p className={cn(DICA, "max-w-[36ch]")}>
          Cada aula assistida até o fim conta para as três medalhas.
        </p>
      </div>
      <div className="relative pt-11">
        <span
          className={cn(
            "absolute top-0 z-[1] grid gap-1",
            feitas === 0
              ? "justify-items-start"
              : "-translate-x-1/2 justify-items-center"
          )}
          data-voce
          style={{ left: ponto }}
        >
          <b className="inline-flex h-[26px] items-center whitespace-nowrap rounded-full bg-sol px-2.5 font-bold text-sobre-cor text-xs tabular-nums">
            Você, {fmtNum(feitas)}
          </b>
          <i aria-hidden="true" className="h-3.5 w-0.5 rounded-xs bg-sol" />
        </span>
        <Trilho
          className="absolute inset-x-0 top-[67px] h-2.5"
          largura={ponto}
        />
        <ol className="relative grid grid-cols-3">
          {degraus.map((d) => (
            <li
              className="grid justify-items-end gap-2.5 text-right"
              key={d.meta}
            >
              <Medalha
                figura="aulas"
                ganha={d.medalha.estado === "ganha"}
                tamanho={56}
              />
              <span className="pl-2.5 font-semibold text-sm text-titulo tabular-nums">
                {fmtNum(d.meta)} aulas
                <small className="block font-normal text-muted-foreground text-xs">
                  {legendaDoDegrau(d, feitas, hoje)}
                </small>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

const BLOCO = cn(
  CARTAO,
  "grid content-start gap-[18px] @min-[521px]:px-6 px-4 @min-[521px]:py-[22px] py-[18px]"
);

function CabecalhoDoBloco({
  resumo,
  titulo,
}: {
  resumo: string | null;
  titulo: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className={TITULO_DO_CARTAO}>{titulo}</h3>
      {resumo ? (
        <span className="whitespace-nowrap text-[13px] text-muted-foreground tabular-nums">
          {resumo}
        </span>
      ) : null}
    </div>
  );
}

const CIRCULO: Record<"feito" | "hoje" | "por_vir", string> = {
  feito: "bg-sol text-sobre-cor",
  hoje: "ring-2 ring-titulo ring-inset",
  por_vir: "ring-1 ring-muted-foreground ring-inset",
};

function SeteDiasSeguidos({
  hoje,
  marco,
}: {
  hoje: DiaISO;
  marco: MarcoDo<"sequencia">;
}) {
  const m = marco.medalha;
  if (m.estado === "ganha") {
    return (
      <div className={BLOCO} data-sequencia="ganha">
        <CabecalhoDoBloco resumo={null} titulo="Sete dias seguidos" />
        <div className="flex items-center gap-4">
          <Medalha figura="sequencia" ganha tamanho={56} />
          <div className="grid justify-items-start gap-1.5">
            <SeloGanho>{ganhaEm(m.dia, hoje)}</SeloGanho>
            {m.vezes > 1 ? (
              <span className={DICA}>{fmtNum(m.vezes)} vezes até hoje</span>
            ) : null}
          </div>
        </div>
        <p className={DICA}>
          Uma aula nova em 7 dias úteis seguidos. Sábado e domingo não quebram.
        </p>
      </div>
    );
  }
  const dias = diasDaSequencia({
    dias: m.dias,
    hoje,
    hojePendente: m.hojePendente,
    meta: m.meta,
  });
  return (
    <div className={BLOCO} data-sequencia="por_ganhar">
      <CabecalhoDoBloco
        resumo={`${fmtNum(m.dias)} de ${fmtNum(m.meta)} dias úteis`}
        titulo="Sete dias seguidos"
      />
      <ul className="grid grid-cols-7 gap-1.5">
        {dias.map((d) => (
          <li
            className={cn(
              "grid min-w-0 justify-items-center gap-1.5 font-semibold text-muted-foreground text-xs",
              d.estado === "hoje" && "text-titulo"
            )}
            key={d.dia}
          >
            <span aria-hidden="true">{siglaDoDia(d)}</span>
            <span
              aria-label={rotuloDoDia(d, hoje)}
              className={cn(
                "grid @min-[421px]:size-9 size-8 place-items-center rounded-full",
                CIRCULO[d.estado]
              )}
              data-dia={d.estado}
              role="img"
            >
              {d.estado === "feito" ? (
                <Check
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2.6}
                />
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <p className={DICA}>{fraseDaSequencia(m.dias, m.hojePendente, m.meta)}</p>
    </div>
  );
}

function PrimeirasVezes({
  hoje,
  marcos,
}: {
  hoje: string;
  marcos: readonly Marco[];
}) {
  const primeiras = marcos.filter(ehPrimeiraVez);
  return (
    <div className={BLOCO}>
      <CabecalhoDoBloco
        resumo={contagemDosMarcos(primeiras)}
        titulo="Primeiras vezes"
      />
      <ol className="divide-y divide-border">
        {primeiras.map((m) => {
          const l = linhaDaPrimeiraVez(m);
          return (
            <li
              className="grid @min-[521px]:grid-cols-[40px_minmax(0,1fr)_auto] grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-3.5 first:pt-0 last:pb-0"
              key={m.tipo}
            >
              <Medalha
                figura={m.tipo}
                ganha={l.estado === "ganha"}
                tamanho={40}
              />
              <div>
                <h4 className="font-semibold text-base text-titulo leading-[1.4]">
                  {l.nome}
                </h4>
                <p className={DICA}>
                  {l.estado === "ganha" ? l.fato : l.proximoPasso}
                </p>
              </div>
              {l.estado === "ganha" ? (
                <span className="@min-[521px]:col-start-3 col-start-2 whitespace-nowrap text-muted-foreground text-xs tabular-nums">
                  {diaCurto(l.dia, hoje)}
                </span>
              ) : (
                <span
                  className={cn(
                    SELO,
                    "@min-[521px]:col-start-3 col-start-2 justify-self-start text-muted-foreground ring-1 ring-muted-foreground ring-inset"
                  )}
                >
                  Por ganhar
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const LACRE = "absolute top-0 right-[18px] -translate-y-1/2";

function Lacre({ certificado: c }: { certificado: CertificadoNaTela }) {
  if (c.estado === "ganha") {
    return (
      <Medalha className={LACRE} figura="certificado" ganha tamanho={56} />
    );
  }
  if (c.feitas === 0) {
    return (
      <Medalha
        className={cn(LACRE, "bg-card")}
        figura="certificado"
        ganha={false}
        tamanho={56}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        LACRE,
        "grid size-14 place-items-center rounded-full border-[1.5px] border-muted-foreground bg-card font-bold text-sm text-titulo tabular-nums"
      )}
      data-medalha="andamento"
    >
      {porcentagem(c.feitas, c.total)}%
    </span>
  );
}

function CartaoDoCertificado({
  certificado: c,
  colunas,
  hoje,
}: {
  certificado: CertificadoNaTela;
  colunas: number;
  hoje: string;
}) {
  const apagada = c.estado === "por_ganhar" && c.feitas === 0;
  return (
    <li className="grid">
      <Link
        className={cn(
          CARTAO,
          "group relative grid grid-rows-[auto_0_1fr] transition-shadow duration-200 ease-forte hover:ring-ceu motion-reduce:transition-none"
        )}
        href={
          c.estado === "ganha"
            ? caminhoDoCertificado(c.curso.slug)
            : caminhoDoCurso(c.curso.slug)
        }
      >
        <span className="relative block aspect-[3/2] overflow-hidden rounded-t-[20px] border-border border-b bg-sidebar">
          <Image
            alt=""
            className={cn(
              "object-cover transition-transform duration-200 ease-forte group-hover:scale-[1.03] motion-reduce:transition-none",
              apagada && "brightness-70 grayscale-60"
            )}
            fill
            sizes={`(max-width: 767px) 100vw, calc((100vw - 380px) / ${colunas})`}
            src={c.curso.capa.url}
          />
        </span>
        <span className="relative h-0">
          <Lacre certificado={c} />
        </span>
        <span className="grid content-start gap-2.5 p-[18px] pr-[84px]">
          <h3 className={cn(TITULO_DO_CARTAO, "line-clamp-2 text-balance")}>
            {c.curso.titulo}
          </h3>
          {c.estado === "ganha" ? (
            <>
              <span className="text-[13px] text-muted-foreground tabular-nums">
                {emitidoEm(c, hoje)}
                <br />
                Código {c.codigo}
              </span>
              <span className="inline-flex items-center gap-1 justify-self-start font-semibold text-[13px] text-titulo underline decoration-muted-foreground underline-offset-4 transition-colors group-hover:decoration-titulo">
                Ver certificado
                <ArrowRight
                  aria-hidden="true"
                  className="size-3"
                  strokeWidth={2.2}
                />
              </span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground text-xs">
                {c.categoria}
              </span>
              <span className="mr-[-66px] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 text-muted-foreground text-xs tabular-nums">
                <Trilho
                  className="h-1"
                  largura={`${porcentagem(c.feitas, c.total)}%`}
                />
                {fmtNum(c.feitas)} de {plural(c.total, "aula", "aulas")}
              </span>
            </>
          )}
        </span>
      </Link>
    </li>
  );
}

function GradeDeCertificados({
  certificados,
  hoje,
}: {
  certificados: readonly CertificadoNaTela[];
  hoje: string;
}) {
  const colunas = colunasDosCertificados(certificados.length);
  return (
    <ol
      className={cn(
        "grid @min-[600px]:grid-cols-[repeat(var(--colunas),minmax(0,1fr))] grid-cols-1 gap-3.5",
        certificados.length === 1 && "@min-[600px]:max-w-[360px]"
      )}
      style={{ "--colunas": colunas } as CSSProperties}
    >
      {certificados.map((c) => (
        <CartaoDoCertificado
          certificado={c}
          colunas={colunas}
          hoje={hoje}
          key={c.curso.id}
        />
      ))}
    </ol>
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

/** Abaixo da trilha, os dois cartões lado a lado de 760 px de container para cima. */
export const BAIXO_DA_TRILHA = "grid gap-3.5 @min-[760px]:grid-cols-2";

export function TelaDeConquistas({ conquistas }: { conquistas: Conquistas }) {
  const { certificados, hoje, marcos } = conquistas;
  const sequencia = marcos.find(
    (m): m is MarcoDo<"sequencia"> => m.tipo === "sequencia"
  );
  return (
    <>
      <CabecalhoDasConquistas contagem={contagemDasMedalhas(conquistas)} />
      <div className="@container grid gap-10">
        <Secao
          id="conquistas-marcos"
          subtitulo={contagemDosMarcos(marcos)}
          titulo="Marcos"
        >
          <div className="grid gap-3.5">
            <TrilhaDeAulas hoje={hoje} marcos={marcos} />
            <div className={BAIXO_DA_TRILHA}>
              {sequencia ? (
                <SeteDiasSeguidos hoje={hoje} marco={sequencia} />
              ) : null}
              <PrimeirasVezes hoje={hoje} marcos={marcos} />
            </div>
          </div>
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
            <GradeDeCertificados certificados={certificados} hoje={hoje} />
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
