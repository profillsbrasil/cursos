"use client";

import { CARACTERES, LIMITES } from "@cursos/api/dominio/edicao-do-curso";
import {
  ALTERNATIVAS,
  acertosParaPassar,
  letraDa,
  NOTA_MINIMA,
} from "@cursos/api/dominio/questionario";
import type { AlternativaId, PerguntaId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";
import { Check, ListChecks, Plus, Trash2, Undo2, X } from "lucide-react";
import {
  type Dispatch,
  type KeyboardEvent,
  useCallback,
  useId,
  useState,
} from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { DICA } from "@/components/casca/estilo";
import { focarDepois, novoId, vizinhoQueFica } from "@/lib/editor";
import { fmtNum, plural } from "@/lib/formato";

import { AreaDeTexto } from "./campo-lido";
import { ErroDoCampo, useErroDoCampo } from "./erros-do-editor";
import { ICONE } from "./partes";
import {
  type AlternativaDoRascunho,
  type AulaDoRascunho,
  ID,
  type PerguntaDoRascunho,
} from "./rascunho-do-curso";
import {
  type AcaoDoAdmin,
  errosNaPergunta,
  type Marcados,
} from "./rascunho-do-editor";

type Despachar = Dispatch<AcaoDoAdmin>;

const ALVO_DO_QUIZ = {
  desfazer: (aula: AulaDoRascunho["id"]) => `aula-${aula}-desfazer`,
  item: (id: PerguntaId) => `pergunta-${id}-item`,
  letra: (id: AlternativaId) => `${ID.alternativa(id)}-letra`,
  novaAlternativa: (id: PerguntaId) => `pergunta-${id}-nova-alternativa`,
  novaPergunta: (aula: AulaDoRascunho["id"]) => `aula-${aula}-nova-pergunta`,
  tirarAlternativa: (id: AlternativaId) => `${ID.alternativa(id)}-tirar`,
  tirarPergunta: (id: PerguntaId) => `pergunta-${id}-tirar`,
};

const PERCENTUAL = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

const camposParaCorrigir = (n: number) =>
  plural(n, "campo para corrigir", "campos para corrigir");

function fraseDaRegra(perguntas: number) {
  const k = acertosParaPassar(perguntas);
  const conta = `${NOTA_MINIMA}% de ${perguntas} é ${PERCENTUAL.format((perguntas * NOTA_MINIMA) / 100)}`;
  const explicacao =
    k === perguntas
      ? `Com ${plural(perguntas, "pergunta", "perguntas")}, o aluno precisa acertar ${perguntas === 1 ? "a pergunta" : `as ${perguntas}`}: ${conta}, e a nota mínima arredonda para cima. Com 4 perguntas, ele pode errar uma.`
      : `Com ${perguntas} perguntas, o aluno passa com ${k} acertos e pode errar ${perguntas - k === 1 ? "uma" : perguntas - k}: ${conta}, arredondado para cima.`;
  return {
    acertos: k,
    explicacao: `${explicacao} A nota mínima é ${NOTA_MINIMA}% em todo curso, e quem não passa tenta de novo.`,
    titulo: `Para passar: ${k} de ${perguntas} ${k === 1 ? "acerto" : "acertos"}`,
  };
}

function RegraDaNota({
  perguntas,
}: {
  perguntas: readonly PerguntaDoRascunho[];
}) {
  const regra = fraseDaRegra(perguntas.length);
  return (
    <div
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-1 rounded-[14px] bg-ceu/8 px-4 py-3 ring-1 ring-ceu/30 ring-inset"
      role="note"
    >
      <span aria-hidden="true" className="flex gap-1">
        {perguntas.map((p, i) => (
          <i
            className={cn(
              "size-3 rounded-full ring-[1.5px] ring-ceu ring-inset",
              i < regra.acertos && "bg-ceu"
            )}
            key={p.id}
          />
        ))}
      </span>
      <b className="font-semibold text-sm text-titulo tabular-nums">
        {regra.titulo}
      </b>
      <p className="col-span-full max-w-[35em] text-pretty text-foreground text-xs">
        {regra.explicacao}
      </p>
    </div>
  );
}

function ItemDaLista({
  escolher,
  indice,
  marcados,
  pergunta,
  selecionada,
}: {
  escolher: (id: PerguntaId) => void;
  indice: number;
  marcados: Marcados;
  pergunta: PerguntaDoRascunho;
  selecionada: boolean;
}) {
  const erros = errosNaPergunta(pergunta, marcados);
  const enunciado = pergunta.enunciado.trim();
  const certa = pergunta.alternativas.findIndex((x) => x.certa);
  const ir = useCallback(() => escolher(pergunta.id), [escolher, pergunta.id]);
  return (
    <li>
      <button
        aria-current={selecionada ? "true" : undefined}
        className={cn(
          "grid w-full grid-cols-[22px_minmax(0,1fr)] gap-2.5 border-border border-b px-3.5 py-3 text-left transition-colors duration-150 hover:bg-white/8 motion-reduce:transition-none",
          selecionada && "bg-sol/8"
        )}
        id={ALVO_DO_QUIZ.item(pergunta.id)}
        onClick={ir}
        type="button"
      >
        <span
          aria-hidden="true"
          className={cn(
            "grid size-[22px] place-items-center rounded-full bg-popover font-semibold text-xs tabular-nums",
            selecionada && "bg-sol/14 text-sol",
            erros > 0 &&
              "bg-transparent text-destructive ring-1 ring-destructive ring-inset"
          )}
        >
          {indice + 1}
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              "line-clamp-2 font-semibold text-[13px] text-foreground leading-[1.35]",
              selecionada && "text-titulo",
              enunciado === "" && "font-medium text-muted-foreground italic"
            )}
          >
            <span className="sr-only">Pergunta {indice + 1}: </span>
            {enunciado || "Pergunta sem texto"}
          </span>
          <span
            className={cn(
              "mt-0.5 block text-muted-foreground text-xs tabular-nums",
              selecionada && "text-foreground",
              erros > 0 && "font-semibold text-destructive"
            )}
          >
            {erros > 0
              ? camposParaCorrigir(erros)
              : `${plural(pergunta.alternativas.length, "alternativa", "alternativas")} · ${certa === -1 ? "sem certa" : `certa ${letraDa(certa)}`}`}
          </span>
        </span>
      </button>
    </li>
  );
}

function Letra({
  alternativa,
  indice,
  marcar,
  pergunta,
}: {
  alternativa: AlternativaDoRascunho;
  indice: number;
  marcar: (alternativaId: AlternativaId) => void;
  pergunta: PerguntaDoRascunho;
}) {
  const letra = letraDa(indice);
  const escolher = useCallback(
    () => marcar(alternativa.id),
    [alternativa.id, marcar]
  );
  return (
    <label
      className="group/letra grid size-9 cursor-pointer place-items-center rounded-full transition-colors duration-150 hover:bg-popover motion-reduce:transition-none"
      htmlFor={ALVO_DO_QUIZ.letra(alternativa.id)}
    >
      <input
        aria-label={
          alternativa.certa
            ? `${letra}, a certa`
            : `Marcar ${letra} como a certa`
        }
        checked={alternativa.certa}
        className="sr-only"
        id={ALVO_DO_QUIZ.letra(alternativa.id)}
        name={`certa-${pergunta.id}`}
        onChange={escolher}
        type="radio"
        value={alternativa.id}
      />
      <span
        aria-hidden="true"
        className={cn(
          "grid size-[26px] place-items-center rounded-full font-semibold text-foreground text-xs ring-[1.5px] ring-muted-foreground ring-inset transition-colors duration-150 group-hover/letra:text-titulo group-hover/letra:ring-ceu group-aria-invalid/alts:ring-destructive motion-reduce:transition-none",
          alternativa.certa &&
            "bg-ceu text-sobre-cor ring-0 group-hover/letra:text-sobre-cor"
        )}
      >
        {letra}
      </span>
    </label>
  );
}

function TirarAlternativa({
  alternativa,
  indice,
  minimo,
  tirar,
}: {
  alternativa: AlternativaDoRascunho;
  indice: number;
  minimo: boolean;
  tirar: (id: AlternativaId) => void;
}) {
  const letra = letraDa(indice);
  const clicar = useCallback(
    () => tirar(alternativa.id),
    [alternativa.id, tirar]
  );
  if (minimo) {
    const frase = `Toda pergunta tem pelo menos ${ALTERNATIVAS.min} alternativas.`;
    return (
      <Tooltip>
        <TooltipTrigger
          aria-describedby={`${ALVO_DO_QUIZ.tirarAlternativa(alternativa.id)}-regra`}
          aria-disabled="true"
          aria-label={`Tirar a alternativa ${letra}`}
          className={cn(
            ICONE,
            "cursor-not-allowed opacity-45 hover:opacity-80"
          )}
          id={ALVO_DO_QUIZ.tirarAlternativa(alternativa.id)}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </TooltipTrigger>
        <TooltipContent className={DICA} side="left">
          {frase}
        </TooltipContent>
        <span
          className="sr-only"
          id={`${ALVO_DO_QUIZ.tirarAlternativa(alternativa.id)}-regra`}
        >
          {frase}
        </span>
      </Tooltip>
    );
  }
  return (
    <Button
      aria-label={`Tirar a alternativa ${letra}`}
      className={ICONE}
      id={ALVO_DO_QUIZ.tirarAlternativa(alternativa.id)}
      onClick={clicar}
    >
      <X aria-hidden="true" />
    </Button>
  );
}

function SituacaoDaCerta({ pergunta }: { pergunta: PerguntaDoRascunho }) {
  const indice = pergunta.alternativas.findIndex((x) => x.certa);
  const certa = pergunta.alternativas[indice];
  if (!certa) {
    return (
      <p className="text-muted-foreground text-xs">
        Nenhuma certa marcada ainda.
      </p>
    );
  }
  return (
    <p className="flex min-w-0 items-center gap-1.5 font-semibold text-ceu text-xs">
      <Check
        aria-hidden="true"
        className="size-3.5 shrink-0"
        strokeWidth={2.5}
      />
      <span className="whitespace-nowrap">Certa: {letraDa(indice)}</span>
      <span className="truncate font-normal text-foreground">
        · {certa.texto.trim() || "sem texto"}
      </span>
    </p>
  );
}

const ENTER_NAO_QUEBRA = (e: KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter") {
    e.preventDefault();
  }
};

function Alternativas({
  despachar,
  indice,
  pergunta,
}: {
  despachar: Despachar;
  indice: number;
  pergunta: PerguntaDoRascunho;
}) {
  const rotulo = useId();
  const grupo = ID.pergunta(pergunta.id, "alternativas");
  const { aria, mensagem } = useErroDoCampo(grupo);
  const marcar = useCallback(
    (alternativaId: AlternativaId) =>
      despachar({
        alternativaId,
        perguntaId: pergunta.id,
        tipo: "certa_marcada",
      }),
    [despachar, pergunta.id]
  );
  const editar = useCallback(
    (id: AlternativaId) => (texto: string) =>
      despachar({ id, texto, tipo: "alternativa_editada" }),
    [despachar]
  );
  const tirar = useCallback(
    (id: AlternativaId) => {
      const i = pergunta.alternativas.findIndex((x) => x.id === id);
      const fica = vizinhoQueFica(pergunta.alternativas, i);
      despachar({ id, tipo: "alternativa_removida" });
      if (fica) {
        focarDepois(ID.alternativa(fica.id));
      }
    },
    [despachar, pergunta.alternativas]
  );
  const adicionar = useCallback(() => {
    const id = novoId<AlternativaId>();
    despachar({ id, perguntaId: pergunta.id, tipo: "alternativa_nova" });
    focarDepois(ID.alternativa(id));
  }, [despachar, pergunta.id]);
  const noMinimo = pergunta.alternativas.length <= ALTERNATIVAS.min;
  return (
    <>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="font-semibold text-sm" id={rotulo}>
          Alternativas
        </span>
        <span className="text-muted-foreground text-xs">
          A letra marca a certa
        </span>
      </div>
      <div
        {...aria}
        aria-labelledby={rotulo}
        className="group/alts grid gap-2"
        id={grupo}
        role="radiogroup"
      >
        {pergunta.alternativas.map((x, i) => (
          <div
            className={cn(
              "grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-x-2 gap-y-1",
              x.certa && "[&_textarea]:border-ceu"
            )}
            key={x.id}
          >
            <Letra
              alternativa={x}
              indice={i}
              marcar={marcar}
              pergunta={pergunta}
            />
            <AreaDeTexto
              aoMudar={editar(x.id)}
              campoClasse="col-start-2 gap-1"
              id={ID.alternativa(x.id)}
              maxLength={CARACTERES.alternativa}
              onKeyDown={ENTER_NAO_QUEBRA}
              placeholder={`Alternativa ${letraDa(i)}`}
              rotulo={`Alternativa ${letraDa(i)} da pergunta ${indice + 1}`}
              rotuloClasse="sr-only"
              rows={1}
              texto={x.texto}
            />
            <TirarAlternativa
              alternativa={x}
              indice={i}
              minimo={noMinimo}
              tirar={tirar}
            />
          </div>
        ))}
      </div>
      {mensagem ? (
        <ErroDoCampo id={grupo} mensagem={mensagem} />
      ) : (
        <SituacaoDaCerta pergunta={pergunta} />
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2">
        {pergunta.alternativas.length < ALTERNATIVAS.max ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-md px-0.5 py-1 font-semibold text-[13px] text-ceu transition-colors hover:text-titulo"
            id={ALVO_DO_QUIZ.novaAlternativa(pergunta.id)}
            onClick={adicionar}
            type="button"
          >
            <Plus aria-hidden="true" className="size-3.5" />
            Alternativa
          </button>
        ) : (
          <span />
        )}
        <span className="text-muted-foreground text-xs tabular-nums">
          {pergunta.alternativas.length} de {ALTERNATIVAS.max} alternativas
        </span>
      </div>
    </>
  );
}

function EdicaoDaPergunta({
  despachar,
  indice,
  pergunta,
  tirar,
  total,
}: {
  despachar: Despachar;
  indice: number;
  pergunta: PerguntaDoRascunho;
  tirar: (pergunta: PerguntaDoRascunho, indice: number) => void;
  total: number;
}) {
  const editar = useCallback(
    (enunciado: string) =>
      despachar({ enunciado, id: pergunta.id, tipo: "pergunta_editada" }),
    [despachar, pergunta.id]
  );
  const remover = useCallback(
    () => tirar(pergunta, indice),
    [indice, pergunta, tirar]
  );
  return (
    <div className="grid min-w-0 content-start gap-3 p-4 pb-[18px]">
      <div className="-mb-1 flex items-center justify-between gap-2">
        <span className="font-semibold text-sm">
          Pergunta {indice + 1} de {total}
        </span>
        <Button
          aria-label={`Tirar a pergunta ${indice + 1}`}
          className={ICONE}
          id={ALVO_DO_QUIZ.tirarPergunta(pergunta.id)}
          onClick={remover}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      <AreaDeTexto
        aoMudar={editar}
        className="min-h-[4.2lh]"
        id={ID.pergunta(pergunta.id, "enunciado")}
        maxLength={CARACTERES.enunciado}
        placeholder="Escreva a pergunta"
        rotulo={`Texto da pergunta ${indice + 1}`}
        rotuloClasse="sr-only"
        rows={2}
        texto={pergunta.enunciado}
      />
      <Alternativas despachar={despachar} indice={indice} pergunta={pergunta} />
    </div>
  );
}

interface Tirada {
  indice: number;
  pergunta: PerguntaDoRascunho;
}

function PerguntaTirada({
  aula,
  desfazer,
  tirada,
}: {
  aula: AulaDoRascunho;
  desfazer: () => void;
  tirada: Tirada;
}) {
  return (
    <div className="grid gap-0.5 border-border border-b px-3.5 py-2.5 text-muted-foreground text-xs">
      <span>Pergunta {tirada.indice + 1} tirada.</span>
      <button
        className="inline-flex items-center gap-1.5 justify-self-start rounded-md py-1 font-semibold text-[13px] text-ceu transition-colors hover:text-titulo"
        id={ALVO_DO_QUIZ.desfazer(aula.id)}
        onClick={desfazer}
        type="button"
      >
        <Undo2 aria-hidden="true" className="size-3.5" />
        Desfazer
      </button>
    </div>
  );
}

export function QuestionarioDaAula({
  aula,
  despachar,
  escolhida,
  marcados,
}: {
  aula: AulaDoRascunho;
  despachar: Despachar;
  escolhida: PerguntaDoRascunho | null;
  marcados: Marcados;
}) {
  const [tirada, guardarTirada] = useState<Tirada | null>(null);
  const { perguntas } = aula;
  const escolher = useCallback(
    (perguntaId: PerguntaId) =>
      despachar({
        aulaId: aula.id,
        perguntaId,
        tipo: "pergunta_escolhida",
      }),
    [aula.id, despachar]
  );
  const adicionar = useCallback(() => {
    const id = novoId<PerguntaId>();
    guardarTirada(null);
    despachar({
      alternativas: [novoId<AlternativaId>(), novoId<AlternativaId>()],
      aulaId: aula.id,
      id,
      tipo: "pergunta_nova",
    });
    focarDepois(ID.pergunta(id, "enunciado"));
  }, [aula.id, despachar]);
  const tirar = useCallback(
    (pergunta: PerguntaDoRascunho, posicao: number) => {
      const fica = vizinhoQueFica(perguntas, posicao);
      if (fica) {
        escolher(fica.id);
      }
      despachar({ id: pergunta.id, tipo: "pergunta_removida" });
      guardarTirada({ indice: posicao, pergunta });
      focarDepois(ALVO_DO_QUIZ.desfazer(aula.id));
    },
    [aula.id, despachar, escolher, perguntas]
  );
  const desfazer = useCallback(() => {
    if (!tirada) {
      return;
    }
    despachar({
      aulaId: aula.id,
      indice: tirada.indice,
      pergunta: tirada.pergunta,
      tipo: "pergunta_restaurada",
    });
    guardarTirada(null);
    focarDepois(ALVO_DO_QUIZ.item(tirada.pergunta.id));
  }, [aula.id, despachar, tirada]);

  const cabecalho = (
    <div className="flex items-center justify-between gap-3">
      <h4 className="flex items-center gap-2 font-semibold text-base text-titulo">
        <ListChecks aria-hidden="true" className="size-[18px] text-ceu" />
        Questionário
      </h4>
      <span className="text-[13px] text-muted-foreground tabular-nums">
        {perguntas.length > 0
          ? plural(perguntas.length, "pergunta", "perguntas")
          : null}
      </span>
    </div>
  );

  if (perguntas.length === 0 || escolhida === null) {
    return (
      <>
        {cabecalho}
        {tirada ? (
          <div className="rounded-[14px] ring-1 ring-border ring-inset">
            <PerguntaTirada aula={aula} desfazer={desfazer} tirada={tirada} />
          </div>
        ) : null}
        <div className="grid justify-items-start gap-3 rounded-[14px] border border-trilho border-dashed p-[22px] text-muted-foreground">
          <p>
            <b className="mb-0.5 block font-semibold text-titulo">
              Esta aula ainda não tem questionário.
            </b>
            O aluno assiste e segue para a próxima aula.
          </p>
          <Button
            className={cn(BOTAO_CONTORNO, PEQUENO)}
            id={ALVO_DO_QUIZ.novaPergunta(aula.id)}
            onClick={adicionar}
          >
            <Plus aria-hidden="true" className="size-4" />
            Criar questionário
          </Button>
        </div>
      </>
    );
  }

  const indice = perguntas.indexOf(escolhida);
  const itens = perguntas.map((p, i) => (
    <ItemDaLista
      escolher={escolher}
      indice={i}
      key={p.id}
      marcados={marcados}
      pergunta={p}
      selecionada={p.id === escolhida.id}
    />
  ));
  if (tirada) {
    itens.splice(
      tirada.indice,
      0,
      <li key="tirada">
        <PerguntaTirada aula={aula} desfazer={desfazer} tirada={tirada} />
      </li>
    );
  }
  return (
    <>
      {cabecalho}
      <RegraDaNota perguntas={perguntas} />
      <div className="@container/quiz">
        <div className="grid @xl/quiz:grid-cols-[200px_minmax(0,1fr)] overflow-hidden rounded-[14px] ring-1 ring-border ring-inset">
          <div className="border-border @xl/quiz:border-r @max-xl/quiz:border-b bg-muted/30">
            <ol aria-label="Perguntas">{itens}</ol>
            <div className="px-3 py-2.5">
              {perguntas.length < LIMITES.perguntasPorAula ? (
                <button
                  className="inline-flex items-center gap-1.5 rounded-md px-0.5 py-1 font-semibold text-[13px] text-ceu transition-colors hover:text-titulo"
                  id={ALVO_DO_QUIZ.novaPergunta(aula.id)}
                  onClick={adicionar}
                  type="button"
                >
                  <Plus aria-hidden="true" className="size-3.5" />
                  Pergunta
                </button>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {fmtNum(LIMITES.perguntasPorAula)} perguntas é o limite.
                </p>
              )}
            </div>
          </div>
          <EdicaoDaPergunta
            despachar={despachar}
            indice={indice}
            key={escolhida.id}
            pergunta={escolhida}
            tirar={tirar}
            total={perguntas.length}
          />
        </div>
      </div>
    </>
  );
}

export function ResumoDoQuiz({ aula }: { aula: AulaDoRascunho }) {
  if (aula.perguntas.length === 0) {
    return null;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <ListChecks aria-hidden="true" className="size-[13px] text-ceu" />
      {plural(aula.perguntas.length, "pergunta", "perguntas")}
    </span>
  );
}
