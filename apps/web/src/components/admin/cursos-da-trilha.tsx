"use client";

import type { CursoNaVisao } from "@cursos/api/dominio/catalogo";
import { LIMITES_DA_TRILHA } from "@cursos/api/dominio/edicao-da-trilha";
import type { CursoId, TrilhaId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@cursos/ui/components/combobox";
import { cn } from "@cursos/ui/lib/utils";
import { ChevronDown, ChevronUp, Minus, Undo2 } from "lucide-react";
import {
  type KeyboardEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { plural } from "@/lib/formato";

import { ErroDoCampo, useErroDoCampo } from "./erros-do-editor";
import {
  cabeMaisUm,
  candidatos,
  enterSeguraOFormulario,
  ID_DA_TRILHA,
  linhasDaLista,
  type MotivoDaBusca,
  type MudancaDaTrilha,
  type Perda,
  type RascunhoDaTrilha,
  textoDaBusca,
} from "./estado-da-trilha";
import { ICONE, ROTULO, SELO, Vazio } from "./partes";

type Mudar = (m: MudancaDaTrilha) => void;

const EM_PRODUCAO = cn(
  SELO,
  "w-fit bg-transparent text-muted-foreground ring-1 ring-muted-foreground ring-inset"
);

const tituloDoCurso = (c: CursoNaVisao) => c.titulo;

function Candidato(c: CursoNaVisao) {
  return (
    <ComboboxItem className="py-2.5 text-sm" key={c.id} value={c}>
      <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
      {c.status === "em_producao" ? (
        <span className="shrink-0 text-muted-foreground text-xs">
          Em produção
        </span>
      ) : null}
    </ComboboxItem>
  );
}

function LinhaDoCurso({
  curso,
  cursoId,
  mudar,
  posicao,
  total,
}: {
  /** undefined: o curso saiu do catálogo depois que a página abriu. */
  curso: CursoNaVisao | undefined;
  cursoId: CursoId;
  mudar: Mudar;
  posicao: number;
  total: number;
}) {
  const nome = curso?.titulo ?? "Curso apagado do catálogo";
  const subir = useCallback(
    () => mudar({ direcao: "acima", id: cursoId, tipo: "curso_movido" }),
    [cursoId, mudar]
  );
  const descer = useCallback(
    () => mudar({ direcao: "abaixo", id: cursoId, tipo: "curso_movido" }),
    [cursoId, mudar]
  );
  const tirar = useCallback(
    () => mudar({ id: cursoId, tipo: "curso_tirado" }),
    [cursoId, mudar]
  );
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-muted font-semibold text-foreground text-sm tabular-nums"
      >
        {posicao}
      </span>
      <span className="grid min-w-0 flex-1 basis-40 gap-1">
        <span className="font-medium text-foreground leading-snug">
          <span className="sr-only">{posicao}º: </span>
          {nome}
        </span>
        {curso?.status === "em_producao" ? (
          <span className={EM_PRODUCAO}>Em produção</span>
        ) : null}
      </span>
      <span className="flex items-center gap-1">
        <Button
          aria-label={`Subir ${nome}`}
          className={ICONE}
          disabled={posicao === 1}
          id={ID_DA_TRILHA.curso(cursoId, "acima")}
          onClick={subir}
        >
          <ChevronUp aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Descer ${nome}`}
          className={ICONE}
          disabled={posicao === total}
          id={ID_DA_TRILHA.curso(cursoId, "abaixo")}
          onClick={descer}
        >
          <ChevronDown aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Tirar ${nome} da trilha`}
          className={cn(BOTAO_CONTORNO, PEQUENO, "ml-1")}
          id={ID_DA_TRILHA.curso(cursoId, "tirar")}
          onClick={tirar}
        >
          Tirar
        </Button>
      </span>
    </li>
  );
}

/** O que tirar este curso faz com quem tem a trilha, com o número da abertura. */
export function consequenciaDoTirado(perda: Perda, alunos: number): string {
  if (alunos === 0) {
    return "Sai da trilha ao salvar.";
  }
  const perde = "Ao salvar, quem só tinha a trilha perde o curso.";
  if (perda.pessoas === null) {
    return perde;
  }
  return perda.pessoas === 0
    ? `${perde} Ninguém tinha começado.`
    : `${perde} ${plural(perda.pessoas, "pessoa já tinha começado", "pessoas já tinham começado")}.`;
}

function LinhaTirada({
  alunos,
  cabe,
  mudar,
  perda,
}: {
  alunos: number;
  cabe: boolean;
  mudar: Mudar;
  perda: Perda;
}) {
  const { cursoId, titulo } = perda;
  const desfazer = useCallback(
    () => mudar({ id: cursoId, tipo: "curso_devolvido" }),
    [cursoId, mudar]
  );
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 bg-sol/5 px-5 py-3.5">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground ring-1 ring-muted-foreground ring-inset"
      >
        <Minus className="size-4" />
      </span>
      <span className="grid min-w-0 flex-1 basis-48 gap-1">
        <span className="font-medium text-muted-foreground leading-snug line-through decoration-muted-foreground">
          <span className="sr-only">Tirado: </span>
          {titulo}
        </span>
        <span className="text-foreground text-sm leading-snug">
          {consequenciaDoTirado(perda, alunos)}
        </span>
      </span>
      <Button
        aria-label={`Desfazer: devolver ${titulo} à trilha`}
        className={cn(BOTAO_CONTORNO, PEQUENO)}
        disabled={!cabe}
        id={ID_DA_TRILHA.curso(cursoId, "desfazer")}
        onClick={desfazer}
      >
        <Undo2 aria-hidden="true" className="size-4" />
        Desfazer
      </Button>
    </li>
  );
}

export function CursosDaTrilha({
  alunos,
  catalogo,
  mudar,
  perdas,
  rascunho,
  salvo,
  trilhaId,
}: {
  /** Pessoas com a trilha liberada: decidem o que a linha riscada diz. */
  alunos: number;
  /** O catálogo inteiro: os nomes da lista e os candidatos da busca. */
  catalogo: readonly CursoNaVisao[];
  mudar: Mudar;
  /** Os cursos da lista salva que este rascunho tira. */
  perdas: readonly Perda[];
  rascunho: RascunhoDaTrilha;
  salvo: readonly CursoId[];
  trilhaId: TrilhaId;
}) {
  const [busca, setBusca] = useState("");
  const { mensagem } = useErroDoCampo(ID_DA_TRILHA.cursos);
  const porId = useMemo(
    () => new Map(catalogo.map((c) => [c.id, c])),
    [catalogo]
  );
  const buscar = useCallback(
    (texto: string, { reason }: { reason: MotivoDaBusca }) =>
      setBusca(textoDaBusca(texto, reason)),
    []
  );
  const acrescentar = useCallback(
    (c: CursoNaVisao | null) => {
      if (c) {
        mudar({ id: c.id, tipo: "curso_acrescentado" });
      }
    },
    [mudar]
  );
  // Só o onKeyDown lê: guardar em ref não redesenha a lista a cada seta.
  const lista = useRef({ aberto: false, destacado: null as number | null });
  const abrir = useCallback((aberto: boolean) => {
    lista.current.aberto = aberto;
  }, []);
  const destacar = useCallback(
    (c: CursoNaVisao | undefined, { index }: { index: number }) => {
      lista.current.destacado = c ? index : null;
    },
    []
  );
  const segurarEnter = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (enterSeguraOFormulario({ ...lista.current, key: e.key })) {
      e.preventDefault();
    }
  }, []);
  const cabe = cabeMaisUm(rascunho);
  const linhas = linhasDaLista(rascunho, salvo);
  const ajuda = `${ID_DA_TRILHA.acrescentar}-ajuda`;
  return (
    <>
      {mensagem ? (
        <div className="border-border border-b px-5 py-3">
          <ErroDoCampo id={ID_DA_TRILHA.cursos} mensagem={mensagem} />
        </div>
      ) : null}
      {linhas.length === 0 ? (
        <Vazio>Nenhum curso ainda. Acrescente o primeiro abaixo.</Vazio>
      ) : (
        <ol className="divide-y divide-border">
          {linhas.map((l) => {
            const perda =
              l.tipo === "tirado"
                ? perdas.find((p) => p.cursoId === l.id)
                : undefined;
            if (perda) {
              return (
                <LinhaTirada
                  alunos={alunos}
                  cabe={cabe}
                  key={l.id}
                  mudar={mudar}
                  perda={perda}
                />
              );
            }
            return l.tipo === "curso" ? (
              <LinhaDoCurso
                curso={porId.get(l.id)}
                cursoId={l.id}
                key={l.id}
                mudar={mudar}
                posicao={l.posicao}
                total={rascunho.cursos.length}
              />
            ) : null;
          })}
        </ol>
      )}
      <div className="grid gap-2 border-border border-t p-5">
        <label className={ROTULO} htmlFor={ID_DA_TRILHA.acrescentar}>
          Acrescentar curso no fim
        </label>
        <Combobox
          disabled={!cabe}
          inputValue={busca}
          items={candidatos(catalogo, rascunho, trilhaId)}
          itemToStringLabel={tituloDoCurso}
          onInputValueChange={buscar}
          onItemHighlighted={destacar}
          onOpenChange={abrir}
          onValueChange={acrescentar}
          value={null}
        >
          <ComboboxInput
            aria-describedby={ajuda}
            className="h-11 w-full rounded-[12px] border-muted-foreground bg-background pl-1 *:data-[slot=input-group-control]:text-sm dark:border-muted-foreground dark:bg-background"
            id={ID_DA_TRILHA.acrescentar}
            onKeyDown={segurarEnter}
            placeholder="Buscar pelo nome"
          />
          <ComboboxContent>
            <ComboboxEmpty className="px-3 py-2.5 text-muted-foreground text-sm">
              Nenhum curso livre com esse nome.
            </ComboboxEmpty>
            <ComboboxList>{Candidato}</ComboboxList>
          </ComboboxContent>
        </Combobox>
        <p className="text-muted-foreground text-sm" id={ajuda}>
          {cabe
            ? "Curso que está em outra trilha não aparece aqui. Use as setas para pôr na posição certa."
            : `A trilha chegou a ${LIMITES_DA_TRILHA.cursos} cursos. Tire um para acrescentar outro.`}
        </p>
      </div>
    </>
  );
}
