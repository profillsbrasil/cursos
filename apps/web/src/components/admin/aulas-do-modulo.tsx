"use client";

import { CARACTERES } from "@cursos/api/dominio/edicao-do-curso";
import type { AulaId, ModuloId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";
import { ChevronDown, ChevronUp, Eye, Plus, Trash2 } from "lucide-react";
import { type ChangeEvent, type Dispatch, useCallback } from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { DICA } from "@/components/casca/estilo";
import {
  type Direcao,
  focarDepois,
  novoId,
  setaDepoisDeMover,
  vizinhoQueFica,
} from "@/lib/editor";
import { plural } from "@/lib/formato";

import { AreaDeTexto, CampoDeTexto, CampoLido } from "./campo-lido";
import {
  type AcaoNasEscolhas,
  aulaEscolhida,
  type Escolhas,
  errosNaAula,
  type Marcados,
  type Mudanca,
  perguntaEscolhida,
} from "./estado-do-editor";
import { ICONE } from "./partes";
import { QuestionarioDaAula, ResumoDoQuiz } from "./questionario-da-aula";
import {
  type AulaDoRascunho,
  ID,
  type ModuloDoRascunho,
} from "./rascunho-do-curso";
import { Selecao } from "./selecao";

type Despachar = Dispatch<Mudanca>;

const ALVO_DA_AULA = {
  item: (id: AulaId) => `aula-${id}-item`,
  nova: (modulo: ModuloId) => `modulo-${modulo}-nova-aula`,
  remover: (id: AulaId) => `aula-${id}-remover`,
};

const AULA_ASSISTIDA =
  "grid size-10 cursor-help place-items-center rounded-full text-ceu hover:bg-muted md:size-9";

const nomeFalado = (n: number, titulo: string) =>
  titulo.trim() ? `aula ${n} (${titulo.trim()})` : `aula ${n}`;

const nomeDoModulo = (m: ModuloDoRascunho) =>
  m.titulo.trim() ? `Módulo ${m.numero} · ${m.titulo}` : `Módulo ${m.numero}`;

const camposParaCorrigir = (n: number) =>
  plural(n, "campo para corrigir", "campos para corrigir");

function AulaAssistida({
  alunos,
  id,
  nome,
}: {
  alunos: number;
  id: AulaId;
  nome: string;
}) {
  const frase = `Assistida por ${plural(alunos, "aluno", "alunos")}. Não se apaga, mas dá para trocar o vídeo e o título.`;
  return (
    <Tooltip>
      <TooltipTrigger
        aria-describedby={`aula-${id}-uso`}
        aria-disabled="true"
        aria-label={`Remover a ${nome}`}
        className={AULA_ASSISTIDA}
        id={ALVO_DA_AULA.remover(id)}
        type="button"
      >
        <Eye aria-hidden="true" className="size-4" />
      </TooltipTrigger>
      <TooltipContent className={DICA} side="left">
        {frase}
      </TooltipContent>
      <span className="sr-only" id={`aula-${id}-uso`}>
        {frase}
      </span>
    </Tooltip>
  );
}

function ItemDaAula({
  assistida,
  aula,
  escolher,
  marcados,
  posicao,
  selecionada,
}: {
  assistida: boolean;
  aula: AulaDoRascunho;
  escolher: (id: AulaId) => void;
  marcados: Marcados;
  posicao: number;
  selecionada: boolean;
}) {
  const erros = errosNaAula(aula, marcados);
  const ir = useCallback(() => escolher(aula.id), [aula.id, escolher]);
  return (
    <li>
      <button
        aria-current={selecionada ? "true" : undefined}
        className={cn(
          "grid w-full grid-cols-[22px_minmax(0,1fr)_16px] items-start gap-2.5 border-border border-t py-3 pr-3.5 pl-4 text-left transition-colors duration-150 hover:bg-white/8 motion-reduce:transition-none",
          selecionada && "bg-sol/8"
        )}
        id={ALVO_DA_AULA.item(aula.id)}
        onClick={ir}
        type="button"
      >
        <span
          aria-hidden="true"
          className={cn(
            "pt-px text-right font-semibold text-[13px] text-muted-foreground tabular-nums",
            selecionada && "text-sol"
          )}
        >
          {posicao}
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              "line-clamp-2 text-pretty font-semibold text-[13px] text-foreground leading-[1.35]",
              selecionada && "text-titulo"
            )}
          >
            <span className="sr-only">Aula {posicao}: </span>
            {aula.titulo.trim() || (
              <span className="font-normal text-muted-foreground">
                Sem título
              </span>
            )}
          </span>
          <span
            className={cn(
              "mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-muted-foreground text-xs tabular-nums",
              selecionada && "text-foreground"
            )}
          >
            {aula.duracao.trim() ? <span>{aula.duracao}</span> : null}
            <ResumoDoQuiz aula={aula} />
            {erros > 0 ? (
              <span className="font-semibold text-destructive">
                {camposParaCorrigir(erros)}
              </span>
            ) : null}
          </span>
        </span>
        {assistida ? (
          <>
            <Eye aria-hidden="true" className="mt-0.5 size-[15px] text-ceu" />
            <span className="sr-only">assistida por alunos</span>
          </>
        ) : (
          <span />
        )}
      </button>
    </li>
  );
}

function focarNoBotao(
  prefixo: string,
  direcao: Direcao,
  chegouNaBorda: boolean
) {
  focarDepois(`${prefixo}-${setaDepoisDeMover(direcao, chegouNaBorda)}`);
}

function PainelDaAula({
  assistida,
  aula,
  despachar,
  escolhas,
  marcados,
  modulo,
  modulos,
  mudarEscolhas,
  posicao,
  total,
}: {
  assistida: number;
  aula: AulaDoRascunho;
  despachar: Despachar;
  escolhas: Escolhas;
  marcados: Marcados;
  modulo: ModuloDoRascunho;
  modulos: readonly ModuloDoRascunho[];
  mudarEscolhas: Dispatch<AcaoNasEscolhas>;
  posicao: number;
  total: number;
}) {
  const { id } = aula;
  const nome = nomeFalado(posicao, aula.titulo);
  const outros = modulos.filter((m) => m.id !== modulo.id);
  const editarAula = useCallback(
    (mudanca: Extract<Mudanca, { tipo: "aula_editada" }>["mudanca"]) =>
      despachar({ id, mudanca, tipo: "aula_editada" }),
    [despachar, id]
  );
  const mudarTitulo = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      editarAula({ titulo: e.target.value }),
    [editarAula]
  );
  const mudarDuracao = useCallback(
    (duracao: string) => editarAula({ duracao }),
    [editarAula]
  );
  const mudarVideo = useCallback(
    (video: string) => editarAula({ video }),
    [editarAula]
  );
  const mudarDescricao = useCallback(
    (descricao: string) => editarAula({ descricao }),
    [editarAula]
  );
  const subir = useCallback(() => {
    despachar({ direcao: "acima", id, tipo: "aula_movida" });
    focarNoBotao(`aula-${id}`, "acima", posicao - 1 === 1);
  }, [despachar, id, posicao]);
  const descer = useCallback(() => {
    despachar({ direcao: "abaixo", id, tipo: "aula_movida" });
    focarNoBotao(`aula-${id}`, "abaixo", posicao + 1 === total);
  }, [despachar, id, posicao, total]);
  const moverPara = useCallback(
    (moduloId: string) => {
      despachar({
        id,
        moduloId: moduloId as ModuloId,
        tipo: "aula_para_modulo",
      });
      focarDepois(`aula-${id}-modulo`);
    },
    [despachar, id]
  );
  const remover = useCallback(() => {
    const vizinho = vizinhoQueFica(modulo.aulas, posicao - 1);
    if (vizinho) {
      mudarEscolhas({
        aulaId: vizinho.id,
        moduloId: modulo.id,
        tipo: "aula_escolhida",
      });
    }
    despachar({ id, tipo: "aula_removida" });
    focarDepois(
      vizinho ? ALVO_DA_AULA.remover(vizinho.id) : ALVO_DA_AULA.nova(modulo.id)
    );
  }, [despachar, id, modulo.aulas, modulo.id, mudarEscolhas, posicao]);

  return (
    <section
      aria-label="Aula escolhida"
      className="@container/painel grid min-w-0 content-start gap-4 px-5 pt-5 pb-6"
    >
      <div className="flex min-h-9 items-center justify-between gap-2">
        <h3 className="flex flex-wrap items-baseline gap-x-2 font-semibold text-base text-titulo">
          <span className="whitespace-nowrap">
            Aula {posicao} de {total}
          </span>
          {assistida > 0 ? (
            <small className="font-normal text-[13px] text-muted-foreground">
              · assistida por alunos
            </small>
          ) : null}
        </h3>
        <span className="-mr-2 flex">
          <Button
            aria-label={`Subir a ${nome}`}
            className={ICONE}
            disabled={posicao === 1}
            id={`aula-${id}-acima`}
            onClick={subir}
          >
            <ChevronUp aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Descer a ${nome}`}
            className={ICONE}
            disabled={posicao === total}
            id={`aula-${id}-abaixo`}
            onClick={descer}
          >
            <ChevronDown aria-hidden="true" />
          </Button>
          {assistida > 0 ? (
            <AulaAssistida alunos={assistida} id={id} nome={nome} />
          ) : (
            <Button
              aria-label={`Remover a ${nome}`}
              className={ICONE}
              id={ALVO_DA_AULA.remover(id)}
              onClick={remover}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </span>
      </div>
      <CampoDeTexto
        campoClasse="gap-1.5"
        className="font-semibold text-lg text-titulo"
        id={ID.aula(id, "titulo")}
        maxLength={CARACTERES.tituloDaAula}
        onChange={mudarTitulo}
        placeholder="Título da aula"
        required
        rotulo="Título da aula"
        value={aula.titulo}
      />
      <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3">
        <CampoLido
          aoMudar={mudarDuracao}
          className="tabular-nums"
          id={ID.aula(id, "duracao")}
          placeholder="12:30"
          required
          rotulo="Duração"
          texto={aula.duracao}
        />
        <CampoLido
          aoMudar={mudarVideo}
          id={ID.aula(id, "video")}
          placeholder="Link ou id do YouTube"
          rotulo="Vídeo"
          texto={aula.video}
        />
      </div>
      <AreaDeTexto
        ajuda="Aparece sob o título no player e na página do curso."
        aoMudar={mudarDescricao}
        id={ID.aula(id, "descricao")}
        maximo={CARACTERES.descricaoDaAula}
        placeholder="Uma ou duas frases sobre o que a aula ensina"
        rotulo="Descrição"
        rows={2}
        texto={aula.descricao}
      />
      {outros.length > 0 ? (
        <Selecao
          aoMudar={moverPara}
          aria-label={`Mover a ${nome} para outro módulo`}
          id={`aula-${id}-modulo`}
          opcoes={outros.map((m) => ({ rotulo: nomeDoModulo(m), valor: m.id }))}
          placeholder="Mover para…"
          tamanho="pilula"
          valor=""
        />
      ) : null}
      <div aria-hidden="true" className="-mx-5 mt-2.5 mb-1.5 h-px bg-border" />
      <QuestionarioDaAula
        aula={aula}
        despachar={despachar}
        escolhida={perguntaEscolhida(aula, escolhas)}
        key={aula.id}
        marcados={marcados}
        mudarEscolhas={mudarEscolhas}
      />
    </section>
  );
}

export function AulasDoModulo({
  assistidasPorAula,
  despachar,
  escolhas,
  marcados,
  modulo,
  modulos,
  mudarEscolhas,
}: {
  assistidasPorAula: Readonly<Record<string, number>>;
  despachar: Despachar;
  escolhas: Escolhas;
  marcados: Marcados;
  modulo: ModuloDoRascunho;
  modulos: readonly ModuloDoRascunho[];
  mudarEscolhas: Dispatch<AcaoNasEscolhas>;
}) {
  const escolhida = aulaEscolhida(modulo, escolhas);
  const nome = modulo.titulo.trim()
    ? `Aulas do módulo ${modulo.numero} (${modulo.titulo.trim()})`
    : `Aulas do módulo ${modulo.numero}`;
  const escolher = useCallback(
    (aulaId: AulaId) =>
      mudarEscolhas({ aulaId, moduloId: modulo.id, tipo: "aula_escolhida" }),
    [modulo.id, mudarEscolhas]
  );
  const adicionar = useCallback(() => {
    const aula = novoId<AulaId>();
    despachar({ id: aula, moduloId: modulo.id, tipo: "aula_nova" });
    focarDepois(ID.aula(aula, "titulo"));
  }, [despachar, modulo.id]);
  return (
    <div className="grid @2xl:grid-cols-[272px_minmax(0,1fr)] border-border border-t">
      <div className="border-border @2xl:border-r @max-2xl:border-b">
        {modulo.aulas.length === 0 ? (
          <p className="px-4 py-4 text-muted-foreground text-sm">
            Nenhuma aula neste módulo.
          </p>
        ) : (
          <ol
            aria-label={nome}
            className="[&>li:first-child>button]:border-t-0"
          >
            {modulo.aulas.map((a, i) => (
              <ItemDaAula
                assistida={(assistidasPorAula[a.id] ?? 0) > 0}
                aula={a}
                escolher={escolher}
                key={a.id}
                marcados={marcados}
                posicao={i + 1}
                selecionada={a.id === escolhida?.id}
              />
            ))}
          </ol>
        )}
        <div className="border-border border-t px-4 py-3">
          <Button
            className={cn(BOTAO_CONTORNO, PEQUENO)}
            id={ALVO_DA_AULA.nova(modulo.id)}
            onClick={adicionar}
          >
            <Plus aria-hidden="true" className="size-4" />
            Adicionar aula
          </Button>
        </div>
      </div>
      {escolhida ? (
        <PainelDaAula
          assistida={assistidasPorAula[escolhida.id] ?? 0}
          aula={escolhida}
          despachar={despachar}
          escolhas={escolhas}
          marcados={marcados}
          modulo={modulo}
          modulos={modulos}
          mudarEscolhas={mudarEscolhas}
          posicao={modulo.aulas.indexOf(escolhida) + 1}
          total={modulo.aulas.length}
        />
      ) : null}
    </div>
  );
}
