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
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";

import { ErroDoCampo, useErroDoCampo } from "./erros-do-editor";
import {
  cabeMaisUm,
  candidatos,
  ID_DA_TRILHA,
  type MotivoDaBusca,
  type MudancaDaTrilha,
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

export function CursosDaTrilha({
  catalogo,
  mudar,
  rascunho,
  trilhaId,
}: {
  /** O catálogo inteiro: os nomes da lista e os candidatos da busca. */
  catalogo: readonly CursoNaVisao[];
  mudar: Mudar;
  rascunho: RascunhoDaTrilha;
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
  const cabe = cabeMaisUm(rascunho);
  const ajuda = `${ID_DA_TRILHA.acrescentar}-ajuda`;
  return (
    <>
      {mensagem ? (
        <div className="border-border border-b px-5 py-3">
          <ErroDoCampo id={ID_DA_TRILHA.cursos} mensagem={mensagem} />
        </div>
      ) : null}
      {rascunho.cursos.length === 0 ? (
        <Vazio>Nenhum curso ainda. Acrescente o primeiro abaixo.</Vazio>
      ) : (
        <ol className="divide-y divide-border">
          {rascunho.cursos.map((cursoId, i) => (
            <LinhaDoCurso
              curso={porId.get(cursoId)}
              cursoId={cursoId}
              key={cursoId}
              mudar={mudar}
              posicao={i + 1}
              total={rascunho.cursos.length}
            />
          ))}
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
          onValueChange={acrescentar}
          value={null}
        >
          <ComboboxInput
            aria-describedby={ajuda}
            className="h-11 w-full rounded-[12px] border-muted-foreground bg-background pl-1 *:data-[slot=input-group-control]:text-sm dark:border-muted-foreground dark:bg-background"
            id={ID_DA_TRILHA.acrescentar}
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
