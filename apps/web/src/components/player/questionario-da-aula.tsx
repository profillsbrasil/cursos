"use client";

import type { VizinhaDaAula } from "@cursos/api/dominio/aula";
import type {
  PerguntaDaAula,
  QuestionarioDaAula as Questionario,
  RespostaCorrigida,
  ResultadoDoQuestionario,
} from "@cursos/api/dominio/questionario";
import { letraDa } from "@cursos/api/dominio/questionario";
import type {
  AlternativaId,
  AulaId,
  PerguntaId,
  TentativaId,
} from "@cursos/api/dominio/tipos";
import { cn } from "@cursos/ui/lib/utils";
import {
  ArrowRight,
  Check,
  CircleAlert,
  ListChecks,
  RotateCcw,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  BOTAO,
  BOTAO_CONTORNO,
  LINK_NO_TEXTO,
} from "@/components/casca/botoes";
import { plural } from "@/lib/formato";
import {
  caminhoDaAula,
  caminhoDoCertificado,
  caminhoDoCurso,
} from "@/lib/rotas";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import {
  ENVIO_FALHOU,
  fraseDoResultado,
  ganhoDe,
  PREFIXO_DA_REGRA,
  textoDoEnvio,
} from "./textos-do-questionario";

type Fase =
  | {
      tipo: "respondendo";
      falhou: boolean;
      marcadas: Readonly<Record<string, AlternativaId>>;
      tentativaId: TentativaId;
    }
  | {
      tipo: "resultado";
      concluiuOCurso: boolean;
      /** Só o envio leva o foco ao resultado; a última tentativa, ao abrir a aula, não. */
      focar: boolean;
      resultado: ResultadoDoQuestionario;
    };

const novaTentativa = (): Fase => ({
  falhou: false,
  marcadas: {},
  tentativaId: crypto.randomUUID() as TentativaId,
  tipo: "respondendo",
});

const faseInicial = (q: Questionario): Fase =>
  q.ultima
    ? {
        concluiuOCurso: false,
        focar: false,
        resultado: q.ultima,
        tipo: "resultado",
      }
    : novaTentativa();

const LADO = "px-[26px] max-sm:px-[18px]";

function Pips({ cheios, total }: { cheios: number; total: number }) {
  return (
    <span aria-hidden="true" className="inline-flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <i
          className={cn(
            "size-3 rounded-full ring-[1.5px] ring-muted-foreground ring-inset",
            i < cheios && "bg-muted-foreground"
          )}
          // biome-ignore lint/suspicious/noArrayIndexKey: os marcadores são iguais e nunca se reordenam.
          key={i}
        />
      ))}
    </span>
  );
}

const ALTERNATIVA =
  "grid min-h-[46px] grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[23px] border py-2 pr-3.5 pl-[9px] text-pretty";
const LETRA =
  "grid size-7 place-items-center rounded-full font-semibold text-xs transition-colors duration-150";

function AlternativaParaMarcar({
  alternativaId,
  indice,
  marcada,
  marcar,
  perguntaId,
  texto,
}: {
  alternativaId: AlternativaId;
  indice: number;
  marcada: boolean;
  marcar: (perguntaId: PerguntaId, alternativaId: AlternativaId) => void;
  perguntaId: PerguntaId;
  texto: string;
}) {
  const aoMudar = useCallback(
    () => marcar(perguntaId, alternativaId),
    [marcar, perguntaId, alternativaId]
  );
  return (
    // O rádio fica escondido no rótulo: as setas trocam a resposta como num grupo
    // de rádio, e o foco de teclado acende o rótulo pela variante hover (#30).
    <label
      className={cn(
        ALTERNATIVA,
        "group/alt cursor-pointer border-border text-foreground transition-colors duration-150 hover:border-ceu",
        marcada && "border-sol bg-sol/8 text-titulo"
      )}
    >
      <input
        checked={marcada}
        className="sr-only"
        name={`pergunta-${perguntaId}`}
        onChange={aoMudar}
        type="radio"
        value={alternativaId}
      />
      <span
        aria-hidden="true"
        className={cn(
          LETRA,
          marcada
            ? "bg-sol text-sobre-cor"
            : "text-foreground ring-[1.5px] ring-muted-foreground ring-inset group-hover/alt:text-titulo group-hover/alt:ring-ceu"
        )}
      >
        {letraDa(indice)}
      </span>
      <span>{texto}</span>
    </label>
  );
}

type Veredito = "certa" | "errada" | "a_certa" | "neutra";

const CAIXA_DO_VEREDITO: Record<Veredito, string> = {
  a_certa: "border-ceu bg-ceu/8 text-titulo",
  certa: "border-ceu bg-ceu/8 text-titulo",
  errada: "border-canela bg-canela/14 text-titulo",
  neutra: "border-border text-muted-foreground",
};

const LETRA_DO_VEREDITO: Record<Veredito, string> = {
  a_certa: "bg-ceu text-sobre-cor",
  certa: "bg-ceu text-sobre-cor",
  errada: "bg-canela text-sobre-cor",
  neutra: "text-foreground ring-[1.5px] ring-muted-foreground ring-inset",
};

const ETIQUETA: Record<Veredito, string | null> = {
  a_certa: "A certa",
  certa: "Sua resposta",
  errada: "Sua resposta",
  neutra: null,
};

function vereditoDe(
  alternativaId: AlternativaId,
  resposta: RespostaCorrigida | undefined
): Veredito {
  if (resposta?.alternativaId === alternativaId) {
    return resposta.certa ? "certa" : "errada";
  }
  return resposta?.certaId === alternativaId ? "a_certa" : "neutra";
}

function AlternativaCorrigida({
  indice,
  texto,
  veredito,
}: {
  indice: number;
  texto: string;
  veredito: Veredito;
}) {
  const etiqueta = ETIQUETA[veredito];
  return (
    <div className={cn(ALTERNATIVA, CAIXA_DO_VEREDITO[veredito])}>
      <span className={cn(LETRA, LETRA_DO_VEREDITO[veredito])}>
        {veredito === "neutra" ? (
          letraDa(indice)
        ) : (
          <>
            {veredito === "errada" ? (
              <X aria-hidden="true" className="size-3.5" strokeWidth={2.8} />
            ) : (
              <Check
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={2.8}
              />
            )}
            <span className="sr-only">{letraDa(indice)}.</span>
          </>
        )}
      </span>
      <span>{texto}</span>
      {etiqueta ? (
        <span
          className={cn(
            "whitespace-nowrap font-semibold text-xs",
            veredito === "errada" ? "text-canela" : "text-ceu"
          )}
        >
          {etiqueta}
        </span>
      ) : null}
    </div>
  );
}

function Pergunta({
  fase,
  marcar,
  numero,
  pergunta,
}: {
  fase: Fase;
  marcar: (perguntaId: PerguntaId, alternativaId: AlternativaId) => void;
  numero: number;
  pergunta: PerguntaDaAula;
}) {
  const resposta =
    fase.tipo === "resultado"
      ? fase.resultado.respostas.find((r) => r.perguntaId === pergunta.id)
      : undefined;
  // A linha é a borda da caixa de fora: no próprio fieldset, o legend senta
  // em cima da borda e a linha corta o enunciado.
  return (
    <div className={cn("border-border border-t py-[22px]", LADO)}>
      <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
        <legend className="mb-3 flex gap-2.5 text-pretty p-0 font-semibold text-base text-titulo leading-[1.45]">
          <span className="shrink-0 font-medium text-muted-foreground tabular-nums">
            {numero}.
          </span>
          <span>{pergunta.enunciado}</span>
        </legend>
        {resposta ? (
          <p
            className={cn(
              "inline-flex items-center gap-1.5 font-semibold text-[13px]",
              resposta.certa ? "text-ceu" : "text-canela"
            )}
          >
            {resposta.certa ? (
              <Check
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={2.5}
              />
            ) : (
              <X aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
            )}
            {resposta.certa ? "Certa" : "Você errou esta"}
          </p>
        ) : null}
        <div className="grid gap-2">
          {pergunta.alternativas.map((a, i) =>
            fase.tipo === "respondendo" ? (
              <AlternativaParaMarcar
                alternativaId={a.id}
                indice={i}
                key={a.id}
                marcada={fase.marcadas[pergunta.id] === a.id}
                marcar={marcar}
                perguntaId={pergunta.id}
                texto={a.texto}
              />
            ) : (
              <AlternativaCorrigida
                indice={i}
                key={a.id}
                texto={a.texto}
                veredito={vereditoDe(a.id, resposta)}
              />
            )
          )}
        </div>
      </fieldset>
    </div>
  );
}

export function Resultado({
  concluiuOCurso,
  focar = false,
  proxima,
  resultado,
  slug,
  temVideo,
  tentarDeNovo,
}: {
  concluiuOCurso: boolean;
  focar?: boolean;
  proxima: VizinhaDaAula | null;
  resultado: ResultadoDoQuestionario;
  slug: string;
  temVideo: boolean;
  tentarDeNovo: () => void;
}) {
  const { texto, titulo } = fraseDoResultado(resultado);
  const { aprovada, pontos } = resultado;
  const id = useId();
  const caixa = useRef<HTMLDivElement>(null);
  // O botão de envio some com o resultado. Sem isto o foco cai no body, e o
  // resultado, que entra já preenchido, não se anuncia pelo role="status".
  useEffect(() => {
    if (focar) {
      caixa.current?.focus();
    }
  }, [focar]);
  return (
    <div
      aria-describedby={`${id}-texto`}
      aria-labelledby={`${id}-titulo`}
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-border border-b py-[22px] max-sm:grid-cols-[auto_minmax(0,1fr)]",
        LADO,
        aprovada ? "bg-ceu/8" : "bg-canela/14"
      )}
      ref={caixa}
      role="status"
      tabIndex={-1}
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-full text-sobre-cor",
          aprovada ? "bg-ceu" : "bg-canela"
        )}
      >
        {aprovada ? (
          <Check aria-hidden="true" className="size-5" strokeWidth={2.6} />
        ) : (
          <RotateCcw aria-hidden="true" className="size-5" strokeWidth={2.6} />
        )}
      </span>
      <h2
        className="font-bold text-titulo text-xl leading-[1.3] tracking-[-0.02em]"
        id={`${id}-titulo`}
      >
        {titulo}
      </h2>
      <span
        className={cn(
          "whitespace-nowrap font-mono font-semibold text-base tabular-nums max-sm:col-start-2",
          pontos > 0 ? "text-sol" : "text-muted-foreground"
        )}
      >
        {ganhoDe(pontos)}
      </span>
      <p
        className="col-start-2 col-end-[-1] text-pretty text-foreground max-sm:col-start-1"
        id={`${id}-texto`}
      >
        {texto}
        {concluiuOCurso ? (
          <>
            {" "}
            Você concluiu o curso:{" "}
            <Link className={LINK_NO_TEXTO} href={caminhoDoCertificado(slug)}>
              o certificado já está na página dele
            </Link>
            .
          </>
        ) : null}
      </p>
      <div className="col-start-2 col-end-[-1] mt-2.5 flex flex-wrap gap-2 max-sm:col-start-1 max-sm:*:flex-1">
        {aprovada ? (
          <Link
            className={BOTAO}
            href={
              proxima && !concluiuOCurso
                ? caminhoDaAula(slug, proxima.id)
                : caminhoDoCurso(slug)
            }
          >
            {proxima && !concluiuOCurso ? "Próxima aula" : "Ver o curso"}
            <ArrowRight aria-hidden="true" />
          </Link>
        ) : (
          <>
            <button className={BOTAO} onClick={tentarDeNovo} type="button">
              <RotateCcw aria-hidden="true" />
              Tentar de novo
            </button>
            {temVideo ? (
              <a className={BOTAO_CONTORNO} href="#video">
                <Video aria-hidden="true" />
                Rever o vídeo
              </a>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function QuestionarioDaAula({
  aulaId,
  proxima,
  questionario,
  slug,
  temVideo,
}: {
  aulaId: AulaId;
  proxima: VizinhaDaAula | null;
  questionario: Questionario;
  slug: string;
  temVideo: boolean;
}) {
  const [fase, setFase] = useState<Fase>(() => faseInicial(questionario));
  const { executar, pendente } = useAcao();
  const total = questionario.perguntas.length;

  const marcar = useCallback(
    (perguntaId: PerguntaId, alternativaId: AlternativaId) =>
      setFase((f) =>
        f.tipo === "respondendo"
          ? {
              ...f,
              falhou: false,
              marcadas: { ...f.marcadas, [perguntaId]: alternativaId },
            }
          : f
      ),
    []
  );
  const tentarDeNovo = useCallback(() => setFase(novaTentativa()), []);

  const respondidas =
    fase.tipo === "respondendo" ? Object.keys(fase.marcadas).length : total;
  const completo = respondidas === total;
  let rotuloDoEnvio = "Enviar respostas";
  if (pendente) {
    rotuloDoEnvio = "Enviando…";
  } else if (fase.tipo === "respondendo" && fase.falhou) {
    rotuloDoEnvio = "Enviar de novo";
  }

  const enviar = useCallback(() => {
    if (fase.tipo !== "respondendo" || !completo || pendente) {
      return;
    }
    const { marcadas, tentativaId } = fase;
    executar(
      () =>
        trpcClient.questionario.responder.mutate({
          aulaId,
          respostas: Object.entries(marcadas).map(
            ([perguntaId, alternativaId]) => ({ alternativaId, perguntaId })
          ),
          tentativaId,
        }),
      {
        aoRecusar: () =>
          setFase((f) =>
            f.tipo === "respondendo" ? { ...f, falhou: true } : f
          ),
        depois: (r) =>
          setFase({
            concluiuOCurso: r.cursoConcluido !== null,
            focar: true,
            resultado: r.resultado,
            tipo: "resultado",
          }),
        erro: ENVIO_FALHOU,
      }
    );
  }, [aulaId, completo, executar, fase, pendente]);

  return (
    <section
      aria-label="Questionário da aula"
      className="scroll-mt-6 overflow-hidden rounded-[20px] bg-card ring-1 ring-border"
      id="questionario"
    >
      {fase.tipo === "resultado" ? (
        <Resultado
          concluiuOCurso={fase.concluiuOCurso}
          focar={fase.focar}
          proxima={proxima}
          resultado={fase.resultado}
          slug={slug}
          temVideo={temVideo}
          tentarDeNovo={tentarDeNovo}
        />
      ) : (
        <header
          className={cn(
            "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 pt-[22px] pb-[18px]",
            LADO
          )}
        >
          <h2 className="font-bold text-2xl text-titulo leading-[1.33] tracking-tight">
            Questionário
          </h2>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground tabular-nums">
            <Pips cheios={questionario.paraPassar} total={total} />
            <span>
              {plural(total, "pergunta", "perguntas")} · {PREFIXO_DA_REGRA}
              <b className="font-semibold text-foreground">
                {questionario.paraPassar} de {total}
              </b>
            </span>
          </p>
        </header>
      )}
      <div>
        {questionario.perguntas.map((p, i) => (
          <Pergunta
            fase={fase}
            key={p.id}
            marcar={marcar}
            numero={i + 1}
            pergunta={p}
          />
        ))}
      </div>
      {fase.tipo === "respondendo" ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-border border-t pt-4 pb-5",
            LADO
          )}
        >
          {fase.falhou ? (
            <p
              className="inline-flex items-center gap-1.5 text-[13px] text-destructive"
              role="alert"
            >
              <CircleAlert aria-hidden="true" className="size-[15px]" />
              {ENVIO_FALHOU}
            </p>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              {textoDoEnvio(respondidas, total)}
            </p>
          )}
          <button
            aria-busy={pendente || undefined}
            aria-disabled={completo ? undefined : true}
            className={cn(
              BOTAO,
              "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-sol aria-disabled:hover:shadow-none"
            )}
            onClick={enviar}
            type="button"
          >
            <ListChecks aria-hidden="true" />
            {rotuloDoEnvio}
          </button>
        </div>
      ) : null}
    </section>
  );
}
